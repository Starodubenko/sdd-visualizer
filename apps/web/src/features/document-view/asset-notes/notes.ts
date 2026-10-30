import { parse, stringify } from 'yaml';

export const CANVAS_PAD = 12;
export const CIRCLE_RADIUS = 11;
export const HANDLE_RADIUS = 8;

export type AssetNote = {
  comments: string[];
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutBox = {
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
  pad: number;
  cssWidth: number;
  cssHeight: number;
};

export type CssRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const commentText = (item: unknown): string | null => {
  if (typeof item === 'string') {
    return item;
  }
  if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
    return item.text;
  }
  return null;
};

export const readNoteComments = (row: Record<string, unknown>): string[] => {
  if (Array.isArray(row.comments)) {
    return row.comments.flatMap((item) => {
      const text = commentText(item);
      return text === null ? [] : [text];
    });
  }
  return typeof row.text === 'string' && row.text.trim() !== '' ? [row.text] : [];
};

const finite = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

export const notesPathForImage = (imagePath: string): string =>
  imagePath.replace(/\.png$/i, '.notes.yaml');

export const isNotesPathChange = (paths: readonly string[], imagePath: string): boolean =>
  paths.includes(notesPathForImage(imagePath));

export const imagePathFromRawSrc = (src: string): string | null => {
  const marker = '/api/raw?path=';
  const at = src.indexOf(marker);
  if (at === -1) {
    return null;
  }
  const encoded = src.slice(at + marker.length).split('&')[0] ?? '';
  const path = decodeURIComponent(encoded);
  if (!path.toLowerCase().endsWith('.png')) {
    return null;
  }
  return path;
};

export const noteElementId = (imagePath: string, number: number): string => {
  const slug = imagePath.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `asset-note-${slug}-${number}`;
};

export const noteBlockElementId = (imagePath: string, number: number): string =>
  `${noteElementId(imagePath, number)}-block`;

export const parseAssetNotes = (source: string): AssetNote[] => {
  let parsed: unknown;
  try {
    parsed = parse(source);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || !('notes' in parsed)) {
    return [];
  }
  const notes = (parsed as { notes: unknown }).notes;
  if (!Array.isArray(notes)) {
    return [];
  }
  const result: AssetNote[] = [];
  for (const item of notes) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const x = finite(row.x);
    const y = finite(row.y);
    const w = finite(row.w);
    const h = finite(row.h);
    if (x === null || y === null || w === null || h === null) {
      continue;
    }
    result.push({
      comments: readNoteComments(row),
      x: clamp01(x),
      y: clamp01(y),
      w: clamp01(w),
      h: clamp01(h),
    });
  }
  return result;
};

export const serializeAssetNotes = (notes: AssetNote[]): string =>
  stringify({ notes });

export const layoutBox = (
  naturalWidth: number,
  naturalHeight: number,
  cssWidth: number,
): LayoutBox => {
  const inner = Math.max(cssWidth - CANVAS_PAD * 2, 1);
  const scale = inner / naturalWidth;
  return {
    naturalWidth,
    naturalHeight,
    scale,
    pad: CANVAS_PAD,
    cssWidth,
    cssHeight: naturalHeight * scale + CANVAS_PAD * 2,
  };
};

export const noteRectCss = (note: AssetNote, box: LayoutBox): CssRect => ({
  x: box.pad + note.x * box.naturalWidth * box.scale,
  y: box.pad + note.y * box.naturalHeight * box.scale,
  w: note.w * box.naturalWidth * box.scale,
  h: note.h * box.naturalHeight * box.scale,
});

export const hitNoteCircle = (
  cssX: number,
  cssY: number,
  notes: AssetNote[],
  box: LayoutBox,
): number | null => {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const rect = noteRectCss(notes[index] as AssetNote, box);
    const dx = cssX - rect.x;
    const dy = cssY - rect.y;
    if (dx * dx + dy * dy <= CIRCLE_RADIUS * CIRCLE_RADIUS) {
      return index;
    }
  }
  return null;
};

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type NoteEditHit =
  | { index: number; kind: 'move' }
  | { index: number; kind: 'resize'; edge: ResizeEdge };

export const hitNoteEdit = (
  cssX: number,
  cssY: number,
  notes: AssetNote[],
  box: LayoutBox,
): NoteEditHit | null => {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const rect = noteRectCss(notes[index] as AssetNote, box);
    const right = rect.x + rect.w;
    const bottom = rect.y + rect.h;
    const withinX = cssX >= rect.x - HANDLE_RADIUS && cssX <= right + HANDLE_RADIUS;
    const withinY = cssY >= rect.y - HANDLE_RADIUS && cssY <= bottom + HANDLE_RADIUS;
    if (!withinX || !withinY) {
      continue;
    }
    const bandX = Math.min(HANDLE_RADIUS, rect.w / 4);
    const bandY = Math.min(HANDLE_RADIUS, rect.h / 4);
    let west = cssX >= rect.x - HANDLE_RADIUS && cssX <= rect.x + bandX;
    let east = cssX <= right + HANDLE_RADIUS && cssX >= right - bandX;
    let north = cssY >= rect.y - HANDLE_RADIUS && cssY <= rect.y + bandY;
    let south = cssY <= bottom + HANDLE_RADIUS && cssY >= bottom - bandY;
    if (west && east) {
      if (Math.abs(cssX - rect.x) <= Math.abs(cssX - right)) {
        east = false;
      } else {
        west = false;
      }
    }
    if (north && south) {
      if (Math.abs(cssY - rect.y) <= Math.abs(cssY - bottom)) {
        south = false;
      } else {
        north = false;
      }
    }
    if ((west || east) && (north || south)) {
      const edge = `${north ? 'n' : 's'}${west ? 'w' : 'e'}` as ResizeEdge;
      return { index, kind: 'resize', edge };
    }
    if ((north || south) && cssX >= rect.x && cssX <= right) {
      return { index, kind: 'resize', edge: north ? 'n' : 's' };
    }
    if ((west || east) && cssY >= rect.y && cssY <= bottom) {
      return { index, kind: 'resize', edge: west ? 'w' : 'e' };
    }
    if (cssX >= rect.x && cssY >= rect.y && cssX <= right && cssY <= bottom) {
      return { index, kind: 'move' };
    }
  }
  return null;
};

export const noteEditCursor = (hit: NoteEditHit | null): string => {
  if (!hit) {
    return 'crosshair';
  }
  if (hit.kind === 'move') {
    return 'move';
  }
  if (hit.edge === 'nw' || hit.edge === 'se') {
    return 'nwse-resize';
  }
  if (hit.edge === 'ne' || hit.edge === 'sw') {
    return 'nesw-resize';
  }
  if (hit.edge === 'n' || hit.edge === 's') {
    return 'ns-resize';
  }
  return 'ew-resize';
};

export const hitNoteBody = (
  cssX: number,
  cssY: number,
  note: AssetNote,
  box: LayoutBox,
): boolean => {
  const rect = noteRectCss(note, box);
  return cssX >= rect.x && cssY >= rect.y && cssX <= rect.x + rect.w && cssY <= rect.y + rect.h;
};

export const fractionFromCss = (
  cssX: number,
  cssY: number,
  box: LayoutBox,
): { x: number; y: number } => ({
  x: (cssX - box.pad) / (box.naturalWidth * box.scale),
  y: (cssY - box.pad) / (box.naturalHeight * box.scale),
});

export const clampNote = (note: AssetNote): AssetNote => {
  const w = Math.min(1, Math.max(0.02, note.w));
  const h = Math.min(1, Math.max(0.02, note.h));
  return {
    comments: note.comments,
    w,
    h,
    x: Math.min(1 - w, Math.max(0, note.x)),
    y: Math.min(1 - h, Math.max(0, note.y)),
  };
};
