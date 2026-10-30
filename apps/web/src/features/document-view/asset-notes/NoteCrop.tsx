import { useEffect, useRef, useState, type FC } from 'react';
import { fetchDocument } from '../../../shared/api';
import { onDocsChanged } from '../../../shared/docs-events';
import { imageRawHref } from '../image-path';
import { noteCropSource } from './note-link';
import {
  isNotesPathChange,
  noteBlockElementId,
  notesPathForImage,
  parseAssetNotes,
  type AssetNote,
} from './notes';

type Props = {
  imagePath: string;
  noteNumber: number;
};

const MAX_WIDTH = 280;

const paintCrop = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  note: AssetNote,
  cssWidth: number,
): void => {
  const crop = noteCropSource(note, image.naturalWidth, image.naturalHeight);
  const cssHeight = Math.max(1, Math.round(cssWidth * (crop.sh / crop.sw)));
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const accent = getComputedStyle(canvas).getPropertyValue('--val').trim() || '#3a6ea5';
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cssWidth, cssHeight);
  const scale = cssWidth / crop.sw;
  const x = note.x * image.naturalWidth - crop.sx;
  const y = note.y * image.naturalHeight - crop.sy;
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.strokeRect(x * scale, y * scale, note.w * image.naturalWidth * scale, note.h * image.naturalHeight * scale);
};

export const NoteCrop: FC<Props> = ({ imagePath, noteNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [note, setNote] = useState<AssetNote | null>(null);
  const [ready, setReady] = useState(false);
  const [cssWidth, setCssWidth] = useState(MAX_WIDTH);

  useEffect(() => {
    const element = new Image();
    element.onload = () => setImage(element);
    element.src = imageRawHref(imagePath);
  }, [imagePath]);

  useEffect(() => {
    let cancelled = false;
    let request = 0;
    const load = (initial: boolean) => {
      if (initial) {
        setReady(false);
      }
      const current = ++request;
      void fetchDocument(notesPathForImage(imagePath))
        .then((document) => {
          if (cancelled || current !== request) {
            return;
          }
          setNote(parseAssetNotes(document.content)[noteNumber - 1] ?? null);
          setReady(true);
        })
        .catch(() => {
          if (cancelled || current !== request) {
            return;
          }
          setNote(null);
          setReady(true);
        });
    };
    load(true);
    const stop = onDocsChanged((paths) => {
      if (isNotesPathChange(paths, imagePath)) {
        load(false);
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [imagePath, noteNumber]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const measure = () => {
      const available = wrap.parentElement?.clientWidth ?? MAX_WIDTH;
      setCssWidth(Math.max(96, Math.min(MAX_WIDTH, available || MAX_WIDTH)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrap.parentElement) {
      observer.observe(wrap.parentElement);
    }
    return () => observer.disconnect();
  }, [ready, note]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !note) {
      return;
    }
    paintCrop(canvas, image, note, cssWidth);
  }, [image, note, cssWidth]);

  const openNote = () => {
    const id = noteBlockElementId(imagePath, noteNumber);
    if (window.location.hash === `#${id}`) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    window.location.hash = id;
  };

  if (ready && !note) {
    return <p className="asset-note-crop-missing">Блок {noteNumber} не найден</p>;
  }

  const label = note?.comments.find((comment) => comment.trim() !== '') ?? `Блок ${noteNumber}`;

  return (
    <button type="button" className="asset-note-crop" ref={wrapRef} onClick={openNote} aria-label={label}>
      <canvas ref={canvasRef} />
    </button>
  );
};
