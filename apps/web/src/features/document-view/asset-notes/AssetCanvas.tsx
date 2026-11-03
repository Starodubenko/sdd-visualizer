import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { fetchDocument, saveDocument } from '../../../shared/api';
import { Toast } from '../../../shared/Toast';
import { imageRawHref } from '../image-path';
import { copyText, noteBlockHref, revealNoteBlock } from './note-link';
import {
  CANVAS_PAD,
  CIRCLE_RADIUS,
  clampNote,
  fractionFromCss,
  hitNoteBody,
  hitNoteCircle,
  hitNoteEdit,
  layoutBox,
  noteEditCursor,
  noteElementId,
  noteBlockElementId,
  noteRectCss,
  notesPathForImage,
  parseAssetNotes,
  serializeAssetNotes,
  type AssetNote,
  type LayoutBox,
  type ResizeEdge,
} from './notes';

type Props = {
  imagePath: string;
  editable: boolean;
  startMarking?: boolean;
  onClearHighlight?: () => void;
};

type Drag =
  | { kind: 'draw'; startX: number; startY: number; x: number; y: number }
  | { kind: 'move'; index: number; dx: number; dy: number }
  | { kind: 'resize'; index: number; edge: ResizeEdge; origin: AssetNote };

const resizeNote = (origin: AssetNote, edge: ResizeEdge, fraction: { x: number; y: number }): AssetNote => {
  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.w;
  let bottom = origin.y + origin.h;
  if (edge.includes('w')) {
    left = fraction.x;
  }
  if (edge.includes('e')) {
    right = fraction.x;
  }
  if (edge.includes('n')) {
    top = fraction.y;
  }
  if (edge.includes('s')) {
    bottom = fraction.y;
  }
  return clampNote({
    ...origin,
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    w: Math.abs(right - left),
    h: Math.abs(bottom - top),
  });
};

const commentCountLabel = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} комментарий`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} комментария`;
  }
  return `${count} комментариев`;
};

const cssPoint = (event: ReactPointerEvent<HTMLCanvasElement>, box: LayoutBox): { x: number; y: number } => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const scaleX = bounds.width === 0 ? 1 : box.cssWidth / bounds.width;
  const scaleY = bounds.height === 0 ? 1 : box.cssHeight / bounds.height;
  return {
    x: (event.clientX - bounds.left) * scaleX,
    y: (event.clientY - bounds.top) * scaleY,
  };
};

const paint = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  notes: AssetNote[],
  box: LayoutBox,
  active: number | null,
  linked: number | null,
  marking: boolean,
  draft: CssDraft | null,
): void => {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.cssWidth * ratio);
  canvas.height = Math.round(box.cssHeight * ratio);
  canvas.style.width = `${box.cssWidth}px`;
  canvas.style.height = `${box.cssHeight}px`;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const style = getComputedStyle(canvas);
  const accent = style.getPropertyValue('--val').trim() || '#3a6ea5';
  const paper = style.getPropertyValue('--paper').trim() || '#ffffff';
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, box.cssWidth, box.cssHeight);
  context.drawImage(
    image,
    box.pad,
    box.pad,
    box.naturalWidth * box.scale,
    box.naturalHeight * box.scale,
  );
  notes.forEach((note, index) => {
    drawNote(context, note, box, index + 1, index === active, index === linked, accent, paper);
  });
  if (draft) {
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.strokeRect(draft.x, draft.y, draft.w, draft.h);
  }
  if (marking) {
    notes.forEach((note) => {
      const rect = noteRectCss(note, box);
      const corners = [
        [rect.x + rect.w, rect.y],
        [rect.x, rect.y + rect.h],
        [rect.x + rect.w, rect.y + rect.h],
      ];
      context.fillStyle = accent;
      corners.forEach(([x, y]) => {
        context.fillRect(x - 4, y - 4, 8, 8);
      });
    });
  }
};

type CssDraft = { x: number; y: number; w: number; h: number };

const LINKED_STROKE = '#e39b2b';

const drawNote = (
  context: CanvasRenderingContext2D,
  note: AssetNote,
  box: LayoutBox,
  number: number,
  active: boolean,
  linked: boolean,
  accent: string,
  paper: string,
): void => {
  const rect = noteRectCss(note, box);
  if (linked) {
    context.fillStyle = 'rgba(227, 155, 43, 0.28)';
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  context.strokeStyle = linked ? LINKED_STROKE : accent;
  context.lineWidth = linked || active ? 3 : 1.5;
  context.strokeRect(rect.x, rect.y, rect.w, rect.h);
  context.beginPath();
  context.fillStyle = accent;
  context.arc(rect.x, rect.y, CIRCLE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = paper;
  context.stroke();
  context.fillStyle = paper;
  context.font = '700 11px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(number), rect.x, rect.y + 0.5);
};

export const AssetCanvas: FC<Props> = ({
  imagePath,
  editable,
  startMarking = false,
  onClearHighlight,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuAnchorRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<LayoutBox | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cssWidth, setCssWidth] = useState(0);
  const [notes, setNotes] = useState<AssetNote[]>([]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [linked, setLinked] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [linkToast, setLinkToast] = useState(0);
  const [marking, setMarking] = useState(startMarking);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number } | null>(null);
  const [focusComment, setFocusComment] = useState<{ note: number; comment: number } | null>(null);
  const [draft, setDraft] = useState<CssDraft | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (linkToast === 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => setLinkToast(0), 2500);
    return () => window.clearTimeout(timer);
  }, [linkToast]);

  useEffect(() => {
    const element = new Image();
    element.onload = () => setImage(element);
    element.src = imageRawHref(imagePath);
  }, [imagePath]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void fetchDocument(notesPathForImage(imagePath))
      .then((document) => {
        if (cancelled) {
          return;
        }
        const next = parseAssetNotes(document.content);
        setNotes(next);
        setSaved(serializeAssetNotes(next));
        setReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setNotes([]);
        setSaved(serializeAssetNotes([]));
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const measure = () => setCssWidth(wrap.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const box = image && cssWidth > CANVAS_PAD * 2
    ? layoutBox(image.naturalWidth, image.naturalHeight, cssWidth)
    : null;
  boxRef.current = box;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !box) {
      return;
    }
    paint(canvas, image, notes, box, active, linked, marking, draft);
  }, [image, box, notes, active, linked, marking, draft]);

  useEffect(() => {
    if (!marking) {
      return;
    }
    setLinked(null);
    onClearHighlight?.();
  }, [marking, onClearHighlight]);

  useEffect(() => {
    const applyHash = () => {
      if (marking) {
        setLinked(null);
        return;
      }
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      const index = notes.findIndex((_, noteIndex) => noteBlockElementId(imagePath, noteIndex + 1) === hash);
      setLinked(index === -1 ? null : index);
      if (index === -1) {
        return;
      }
      let parent: HTMLElement | null = wrapRef.current;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) {
          parent.open = true;
        }
        parent = parent.parentElement;
      }
      revealNoteBlock(noteBlockElementId(imagePath, index + 1));
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [notes, imagePath, image, cssWidth, marking]);

  useEffect(() => {
    if (!focusComment) {
      return;
    }
    const field = menuRef.current?.querySelector(
      `[data-comment="${focusComment.note}-${focusComment.comment}"]`,
    );
    if (field instanceof HTMLTextAreaElement) {
      field.focus();
    }
  }, [focusComment, notes]);

  useEffect(() => {
    if (menuIndex === null) {
      setMenuBox(null);
      return;
    }
    const place = () => {
      const anchor = menuAnchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) {
        return;
      }
      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const width = menuRect.width || 280;
      const height = menuRect.height || 0;
      let left = anchorRect.left;
      let top = anchorRect.bottom + 4;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, anchorRect.top - height - 4);
      }
      setMenuBox((current) => (
        current && current.top === top && current.left === left ? current : { top, left }
      ));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [menuIndex, notes]);

  useEffect(() => {
    if (menuIndex === null) {
      return;
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setMenuIndex(null);
        return;
      }
      if (target.closest('.asset-comment-count') || target.closest('.asset-comment-menu')) {
        return;
      }
      setMenuIndex(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menuIndex]);

  const showPlainImage = ready && !marking && notes.length === 0;

  const commentCount = (note: AssetNote): number =>
    note.comments.filter((comment) => comment.trim() !== '').length;

  const scrollToNote = (index: number) => {
    const row = document.getElementById(noteElementId(imagePath, index + 1));
    row?.scrollIntoView({ block: 'nearest' });
  };

  const hoverCursor = (point: { x: number; y: number }, current: LayoutBox): string => {
    if (!marking) {
      const onNote = hitNoteCircle(point.x, point.y, notes, current) !== null
        || notes.some((note) => hitNoteBody(point.x, point.y, note, current));
      return onNote ? 'pointer' : 'default';
    }
    return noteEditCursor(hitNoteEdit(point.x, point.y, notes, current));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = boxRef.current;
    if (!current || !ready) {
      return;
    }
    const point = cssPoint(event, current);
    if (marking) {
      const hit = hitNoteEdit(point.x, point.y, notes, current);
      if (hit?.kind === 'resize') {
        const origin = notes[hit.index];
        if (!origin) {
          return;
        }
        dragRef.current = { kind: 'resize', index: hit.index, edge: hit.edge, origin };
        setActive(hit.index);
        event.currentTarget.style.cursor = noteEditCursor(hit);
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      if (hit?.kind === 'move') {
        const fraction = fractionFromCss(point.x, point.y, current);
        const note = notes[hit.index] as AssetNote;
        dragRef.current = {
          kind: 'move',
          index: hit.index,
          dx: note.x - fraction.x,
          dy: note.y - fraction.y,
        };
        setActive(hit.index);
        event.currentTarget.style.cursor = 'move';
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      dragRef.current = { kind: 'draw', startX: point.x, startY: point.y, x: point.x, y: point.y };
      event.currentTarget.style.cursor = 'crosshair';
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const circle = hitNoteCircle(point.x, point.y, notes, current);
    if (circle !== null) {
      setActive(circle);
      scrollToNote(circle);
      return;
    }
    const body = notes.findIndex((note) => hitNoteBody(point.x, point.y, note, current));
    if (body !== -1) {
      setActive(body);
      scrollToNote(body);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = boxRef.current;
    if (!current) {
      return;
    }
    const point = cssPoint(event, current);
    const drag = dragRef.current;
    if (!drag) {
      event.currentTarget.style.cursor = hoverCursor(point, current);
      return;
    }
    if (drag.kind === 'draw') {
      event.currentTarget.style.cursor = 'crosshair';
      drag.x = point.x;
      drag.y = point.y;
      const x = Math.min(drag.startX, point.x);
      const y = Math.min(drag.startY, point.y);
      setDraft({ x, y, w: Math.abs(point.x - drag.startX), h: Math.abs(point.y - drag.startY) });
      return;
    }
    const fraction = fractionFromCss(point.x, point.y, current);
    if (drag.kind === 'move') {
      event.currentTarget.style.cursor = 'move';
      setNotes((currentNotes) => currentNotes.map((note, index) => (
        index === drag.index
          ? clampNote({ ...note, x: fraction.x + drag.dx, y: fraction.y + drag.dy })
          : note
      )));
      return;
    }
    event.currentTarget.style.cursor = noteEditCursor({ index: drag.index, kind: 'resize', edge: drag.edge });
    setNotes((currentNotes) => currentNotes.map((note, index) => (
      index === drag.index ? resizeNote(drag.origin, drag.edge, fraction) : note
    )));
  };

  const onPointerLeave = () => {
    if (dragRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = marking ? 'crosshair' : 'default';
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = boxRef.current;
    const drag = dragRef.current;
    dragRef.current = null;
    setDraft(null);
    if (!current || !drag || drag.kind !== 'draw') {
      return;
    }
    const x = Math.min(drag.startX, drag.x);
    const y = Math.min(drag.startY, drag.y);
    const w = Math.abs(drag.x - drag.startX);
    const h = Math.abs(drag.y - drag.startY);
    if (w < 8 || h < 8) {
      return;
    }
    const start = fractionFromCss(x, y, current);
    const size = fractionFromCss(x + w, y + h, current);
    const note = clampNote({
      comments: [],
      x: start.x,
      y: start.y,
      w: size.x - start.x,
      h: size.y - start.y,
    });
    const index = notes.length;
    setNotes((currentNotes) => [...currentNotes, note]);
    setActive(index);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const updateComment = (index: number, commentIndex: number, text: string) => {
    setNotes((currentNotes) => currentNotes.map((note, noteIndex) => (
      noteIndex === index
        ? {
          ...note,
          comments: note.comments.map((comment, itemIndex) => (
            itemIndex === commentIndex ? text : comment
          )),
        }
        : note
    )));
  };

  const addComment = (index: number) => {
    const comment = notes[index]?.comments.length ?? 0;
    setNotes((currentNotes) => currentNotes.map((note, noteIndex) => (
      noteIndex === index ? { ...note, comments: [...note.comments, ''] } : note
    )));
    setFocusComment({ note: index, comment });
    setMenuIndex(index);
  };

  const removeComment = (index: number, commentIndex: number) => {
    setNotes((currentNotes) => currentNotes.map((note, noteIndex) => (
      noteIndex === index
        ? { ...note, comments: note.comments.filter((_, itemIndex) => itemIndex !== commentIndex) }
        : note
    )));
  };

  const removeNote = (index: number) => {
    setNotes((currentNotes) => currentNotes.filter((_, noteIndex) => noteIndex !== index));
    setActive(null);
    setMenuIndex((current) => (current === index ? null : current));
  };

  const save = () => {
    setSaving(true);
    setError('');
    const content = serializeAssetNotes(notes);
    void saveDocument(notesPathForImage(imagePath), content)
      .then(() => setSaved(content))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить заметки');
      })
      .finally(() => setSaving(false));
  };

  const dirty = serializeAssetNotes(notes) !== saved;

  return (
    <div className={marking ? 'asset-canvas-wrap is-marking' : 'asset-canvas-wrap'} ref={wrapRef}>
      {showPlainImage ? (
        <img className="asset-image" src={imageRawHref(imagePath)} alt="" />
      ) : (
        <canvas
          ref={canvasRef}
          aria-label="Снимок с заметками"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
        />
      )}
      {box && notes.map((note, index) => {
        const rect = noteRectCss(note, box);
        const count = commentCount(note);
        return (
          <div key={`block-${noteElementId(imagePath, index + 1)}`}>
            <div
              id={noteBlockElementId(imagePath, index + 1)}
              className={linked === index ? 'asset-note-block is-linked' : 'asset-note-block'}
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            >
              <button
                type="button"
                className={copied === index ? 'asset-note-copy is-copied' : 'asset-note-copy'}
                aria-label={copied === index ? 'Ссылка скопирована' : 'Скопировать ссылку на блок'}
                title="Скопировать ссылку на блок"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  copyText(noteBlockHref(window.location.href, imagePath, index + 1));
                  setCopied(index);
                  setLinkToast((current) => current + 1);
                  window.setTimeout(() => {
                    setCopied((current) => (current === index ? null : current));
                  }, 1500);
                }}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <rect x="5.2" y="5.2" width="8" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 10.4V2.8h7.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className={menuIndex === index ? 'asset-comment-count is-open' : 'asset-comment-count'}
              style={{ left: rect.x + CIRCLE_RADIUS + 6, top: rect.y - 11 }}
              aria-label={commentCountLabel(count)}
              aria-expanded={menuIndex === index}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setActive(index);
                if (menuIndex === index) {
                  setMenuIndex(null);
                  return;
                }
                menuAnchorRef.current = event.currentTarget;
                setMenuIndex(index);
              }}
            >
              {count}
            </button>
          </div>
        );
      })}
      {notes.length > 0 && (
        <table className="asset-notes">
          <tbody>
            {notes.map((note, index) => (
              <tr
                key={noteElementId(imagePath, index + 1)}
                id={noteElementId(imagePath, index + 1)}
                className={linked === index ? 'is-linked' : active === index ? 'is-active' : undefined}
                onClick={() => setActive(index)}
              >
                <th scope="row">{index + 1}</th>
                <td>
                  {note.comments.some((comment) => comment.trim() !== '') ? (
                    <ol className="asset-note-comments">
                      {note.comments.filter((comment) => comment.trim() !== '').map((comment, commentIndex) => (
                        <li key={`${index}-${commentIndex}`}>{comment}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="asset-comment-empty">Пока нет комментариев</p>
                  )}
                </td>
                {marking && (
                  <td className="asset-notes-order">
                    <button type="button" onClick={() => removeNote(index)}>Удалить</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editable && (
        <div className="asset-notes-actions">
          {marking ? (
            <>
              <p className="asset-notes-hint">По пустому месту тянется новый блок. Сам блок двигается, край и угол меняют размер.</p>
              <button type="button" onClick={save} disabled={!dirty || saving}>
                Сохранить
              </button>
              <button type="button" onClick={() => { setMenuIndex(null); setMarking(false); }}>
                Готово
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMarking(true)}>
              Разметить
            </button>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {menuIndex !== null && notes[menuIndex] && createPortal(
        <div
          className="asset-comment-menu"
          ref={menuRef}
          style={{
            top: menuBox?.top ?? 0,
            left: menuBox?.left ?? 0,
            visibility: menuBox ? 'visible' : 'hidden',
          }}
        >
          {marking && (
            <button type="button" className="asset-comment-add" onClick={() => addComment(menuIndex)}>
              Добавить комментарий
            </button>
          )}
          {notes[menuIndex].comments.length === 0 ? (
            <p className="asset-comment-empty">Пока нет комментариев</p>
          ) : (
            <ol className="asset-comment-items">
              {notes[menuIndex].comments.map((comment, commentIndex) => (
                <li key={`${menuIndex}-${commentIndex}`}>
                  {marking ? (
                    <>
                      <textarea
                        data-comment={`${menuIndex}-${commentIndex}`}
                        aria-label={`Комментарий ${commentIndex + 1}`}
                        value={comment}
                        placeholder="Комментарий"
                        onChange={(event) => updateComment(menuIndex, commentIndex, event.target.value)}
                      />
                      <button type="button" onClick={() => removeComment(menuIndex, commentIndex)}>
                        Удалить
                      </button>
                    </>
                  ) : (
                    <p>{comment}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>,
        document.body,
      )}
      {linkToast > 0 && createPortal(<Toast kind="ok" message="Ссылка скопирована" />, document.body)}
    </div>
  );
};
