import { adocFragmentLink, parseFragmentBrowserUrl } from '../text-fragment';
import { noteBlockElementId } from './notes';

const NOTE_LINK = /note:(\S+?)\[(\d+)\]/g;

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const isCodeFence = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed === '----' || trimmed === '....' || trimmed === '____';
};

export const embedNoteLinks = (source: string): string => {
  const lines = source.split('\n');
  let fence: string | null = null;
  return lines.map((line) => {
    const trimmed = line.trim();
    if (fence) {
      if (trimmed === fence) {
        fence = null;
      }
      return line;
    }
    if (isCodeFence(line)) {
      fence = trimmed;
      return line;
    }
    return line.replace(NOTE_LINK, (_match, path: string, number: string) => (
      `pass:[<span class="asset-note-ref" data-image="${escapeAttr(path)}" data-note="${number}"></span>]`
    ));
  }).join('\n');
};

export type CropSource = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export const noteCropSource = (
  note: { x: number; y: number; w: number; h: number },
  naturalWidth: number,
  naturalHeight: number,
  pad = 8,
): CropSource => {
  const sx = Math.max(0, Math.round(note.x * naturalWidth - pad));
  const sy = Math.max(0, Math.round(note.y * naturalHeight - pad));
  const ex = Math.min(naturalWidth, Math.round((note.x + note.w) * naturalWidth + pad));
  const ey = Math.min(naturalHeight, Math.round((note.y + note.h) * naturalHeight + pad));
  return {
    sx,
    sy,
    sw: Math.max(1, ex - sx),
    sh: Math.max(1, ey - sy),
  };
};

export const noteBlockHref = (pageHref: string, imagePath: string, number: number): string => {
  const url = new URL(pageHref);
  url.searchParams.set('noteImage', imagePath);
  url.searchParams.set('note', String(number));
  url.hash = noteBlockElementId(imagePath, number);
  return url.toString();
};

const slugify = (path: string): string =>
  path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');

const featureRoot = (documentPath: string): string | null => {
  const parts = documentPath.split('/').filter((part) => part !== '');
  const index = parts.findIndex((part) => (
    part === 'in-progress' || part === 'ready-to-implement' || part === 'done' || part === 'assets'
  ));
  if (index <= 0) {
    return null;
  }
  return parts.slice(0, index).join('/');
};

export type ParsedBlockLink = {
  imagePath: string;
  number: number;
};

const imageFromBlockHash = (hash: string, hintPath: string): ParsedBlockLink | null => {
  const match = /^asset-note-(.+)-(\d+)-block$/.exec(hash);
  const root = featureRoot(hintPath);
  if (!match || !root) {
    return null;
  }
  const slug = match[1] ?? '';
  const number = Number(match[2]);
  const prefix = slugify(root);
  if (!Number.isInteger(number) || number < 1 || !slug.startsWith(`${prefix}-`)) {
    return null;
  }
  const file = /^assets-(.+)-png$/.exec(slug.slice(prefix.length + 1));
  if (!file?.[1]) {
    return null;
  }
  return { imagePath: `${root}/assets/${file[1]}.png`, number };
};

export const parseBlockLinkUrl = (raw: string, documentPath = ''): ParsedBlockLink | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const hash = decodeURIComponent(url.hash.replace(/^#/, ''));
  const pagePath = url.searchParams.get('path') ?? '';
  const fromHash = imageFromBlockHash(hash, pagePath || documentPath);
  const number = Number(url.searchParams.get('note') ?? fromHash?.number);
  if (!Number.isInteger(number) || number < 1) {
    return null;
  }
  const noteImage = url.searchParams.get('noteImage') ?? '';
  const imagePath = noteImage.toLowerCase().endsWith('.png')
    ? noteImage
    : pagePath.toLowerCase().endsWith('.png')
      ? pagePath
      : fromHash?.imagePath ?? '';
  if (!imagePath.startsWith('docs/')) {
    return null;
  }
  return { imagePath, number };
};

export const relativeDocsPath = (documentPath: string, targetPath: string): string => {
  const from = documentPath.split('/').slice(0, -1);
  const to = targetPath.split('/').filter((part) => part !== '');
  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) {
    shared += 1;
  }
  const parts = [...Array.from({ length: from.length - shared }, () => '..'), ...to.slice(shared)];
  return parts.join('/') || targetPath;
};

export const adocNoteLink = (documentPath: string, imagePath: string, number: number): string => {
  const path = imagePath.startsWith('docs/') && documentPath !== ''
    ? relativeDocsPath(documentPath, imagePath)
    : imagePath;
  return `note:${path}[${number}]`;
};

const PASTED_BLOCK_URL = /(?:note:\s*)?(https?:\/\/[^\s<>]+)/g;

export const normalizePastedNoteLinks = (text: string, documentPath: string): string =>
  text.replace(PASTED_BLOCK_URL, (match, url: string) => {
    const cleaned = url.replace(/[.,;]+$/, '');
    const trailing = url.slice(cleaned.length);
    const parsed = parseBlockLinkUrl(cleaned, documentPath);
    if (parsed) {
      return `${adocNoteLink(documentPath, parsed.imagePath, parsed.number)}${trailing}`;
    }
    const fragment = parseFragmentBrowserUrl(cleaned);
    if (fragment) {
      return `${adocFragmentLink(relativeDocsPath(documentPath, fragment.path), fragment.text)}${trailing}`;
    }
    return match;
  });

export const copyText = (value: string): void => {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  void navigator.clipboard.writeText(value).catch(() => undefined);
};

const scrollIntoSheet = (node: HTMLElement): boolean => {
  const scroller = node.closest('.sheet');
  if (!(scroller instanceof HTMLElement)) {
    node.scrollIntoView({ block: 'center' });
    return true;
  }
  const nodeRect = node.getBoundingClientRect();
  const scrollRect = scroller.getBoundingClientRect();
  if (nodeRect.height < 2) {
    return false;
  }
  const fits = nodeRect.height < scrollRect.height - 24;
  const delta = fits
    ? nodeRect.top - scrollRect.top - (scrollRect.height - nodeRect.height) / 2
    : nodeRect.top - scrollRect.top - 12;
  scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + delta) });
  const next = node.getBoundingClientRect();
  return fits
    ? next.top >= scrollRect.top - 8 && next.bottom <= scrollRect.bottom + 8
    : Math.abs(next.top - scrollRect.top - 12) < 12;
};

export const revealNoteBlock = (elementId: string): void => {
  let attempts = 0;
  const step = () => {
    const node = document.getElementById(elementId);
    if (!node) {
      if (attempts < 12) {
        attempts += 1;
        window.requestAnimationFrame(step);
      }
      return;
    }
    let parent: HTMLElement | null = node;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) {
        parent.open = true;
      }
      parent = parent.parentElement;
    }
    window.requestAnimationFrame(() => {
      const current = document.getElementById(elementId);
      const landed = current ? scrollIntoSheet(current) : false;
      if (!landed && attempts < 12) {
        attempts += 1;
        window.requestAnimationFrame(step);
      }
    });
  };
  step();
};
