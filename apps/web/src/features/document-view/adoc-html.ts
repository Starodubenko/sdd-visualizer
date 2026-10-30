import { convert } from '@asciidoctor/core';
import { resolveRelative } from '../../pages/Workspace/tree-window';
import { embedNoteLinks } from './asset-notes/note-link';
import { linkifyText } from './doc-links';

const CONVERT_OPTIONS = {
  safe: 'safe',
  standalone: false,
  attributes: { showtitle: '', sectids: false },
};

const htmlCache = new Map<string, string>();

export type AdocPart =
  | { kind: 'adoc'; source: string }
  | { kind: 'mermaid'; source: string };

const isMermaidAttr = (line: string): boolean => /^\[source,\s*mermaid\]\s*$/.test(line.trim());

export const splitMermaidBlocks = (source: string): AdocPart[] => {
  const lines = source.split('\n');
  const parts: AdocPart[] = [];
  const buffer: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }
    parts.push({ kind: 'adoc', source: buffer.join('\n') });
    buffer.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (fence) {
      buffer.push(line);
      if (trimmed === fence) {
        fence = null;
      }
      continue;
    }
    if (isMermaidAttr(line)) {
      let cursor = index + 1;
      while (cursor < lines.length && (lines[cursor] ?? '').trim() === '') {
        cursor += 1;
      }
      if ((lines[cursor] ?? '').trim() === '----') {
        flush();
        const body: string[] = [];
        cursor += 1;
        while (cursor < lines.length && (lines[cursor] ?? '').trim() !== '----') {
          body.push(lines[cursor] ?? '');
          cursor += 1;
        }
        parts.push({ kind: 'mermaid', source: body.join('\n') });
        index = cursor;
        continue;
      }
    }
    buffer.push(line);
    if (trimmed === '----' || trimmed === '....' || trimmed === '____' || trimmed === '|===') {
      fence = trimmed;
    }
  }
  flush();
  return parts;
};

export const adocFragments = (source: string): string[] =>
  splitMermaidBlocks(source)
    .filter((part) => part.kind === 'adoc')
    .map((part) => part.source);

export const cachedAdocHtml = (source: string): string => htmlCache.get(source) ?? '';

export const warmAdoc = async (source: string): Promise<void> => {
  const fragments = adocFragments(source);
  await Promise.all(
    fragments.map(async (fragment) => {
      if (fragment.trim() === '' || htmlCache.has(fragment)) {
        return;
      }
      const html = await convert(embedNoteLinks(fragment), CONVERT_OPTIONS);
      htmlCache.set(fragment, String(html));
    }),
  );
};

export const loadAdocHtml = async (source: string): Promise<string> => {
  if (source.trim() === '') {
    return '';
  }
  const cached = htmlCache.get(source);
  if (cached !== undefined) {
    return cached;
  }
  const html = String(await convert(embedNoteLinks(source), CONVERT_OPTIONS));
  htmlCache.set(source, html);
  return html;
};

const imageHref = (documentPath: string, src: string): string => {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  const resolved = resolveRelative(documentPath, src);
  if (resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('/')) {
    return resolved;
  }
  return `/api/raw?path=${encodeURIComponent(resolved)}`;
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (value: string): string =>
  escapeHtml(value).replace(/"/g, '&quot;');

export const rewriteAdocImages = (html: string, documentPath: string): string => {
  const withSrc = html.replace(/<img\b([^>]*?)>/g, (tag, attrs: string) => {
    const srcMatch = /\ssrc="([^"]*)"/.exec(attrs);
    if (!srcMatch) {
      return tag;
    }
    const next = imageHref(documentPath, srcMatch[1]);
    return `<img${attrs.replace(srcMatch[0], ` src="${next}"`)}>`;
  });
  return withSrc.replace(/<a\b([^>]*?)>/g, (tag, attrs: string) => {
    if (!/\bclass="[^"]*\bimage\b/.test(attrs)) {
      return tag;
    }
    const href = /\bhref="([^"]*)"/.exec(attrs);
    if (!href || !/^https?:\/\//i.test(href[1])) {
      return tag;
    }
    let next = attrs;
    if (!/\btarget=/.test(next)) {
      next += ' target="_blank"';
    }
    if (!/\brel=/.test(next)) {
      next += ' rel="noreferrer"';
    }
    next = next.replace(/\bclass="([^"]*)"/, (_match, className: string) => `class="${className} doc-pixo"`);
    return `<a${next}>`;
  });
};

export const rewriteAdocLinks = (html: string): string =>
  html.replace(/<a\b([^>]*?)>([\s\S]*?)<\/a>/g, (tag, attrs: string, inner: string) => {
    if (/\bclass="[^"]*\bimage\b/.test(attrs)) {
      return tag;
    }
    const hrefMatch = /\bhref="([^"]*)"/.exec(attrs);
    if (!hrefMatch) {
      return tag;
    }
    const href = hrefMatch[1];
    if (/^https?:\/\//i.test(href)) {
      return tag;
    }
    const hashAt = href.indexOf('#');
    const pathPart = hashAt === -1 ? href : href.slice(0, hashAt);
    if (!/\.(?:html|adoc)$/i.test(pathPart)) {
      return tag;
    }
    const adocPath = pathPart.replace(/\.html$/i, '.adoc');
    const rawAnchor = hashAt === -1 ? '' : href.slice(hashAt + 1);
    let anchor = '';
    try {
      anchor = decodeURIComponent(rawAnchor);
    } catch {
      anchor = rawAnchor;
    }
    const label = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const highlight = label === '' ? '' : ` data-highlight="${escapeAttr(label)}"`;
    const anchorAttr = anchor === '' ? '' : ` data-anchor="${escapeAttr(anchor)}"`;
    return `<button type="button" class="doc-link" data-path="${escapeAttr(adocPath)}"${highlight}${anchorAttr}>${inner}</button>`;
  });

const API_VERBS = /^(get|post|put|patch|delete|head|options)$/i;

const unescapeHtml = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

const apiOpButton = (method: string, path: string): string => {
  const verb = method.trim();
  const route = unescapeHtml(path.trim());
  const tone = API_VERBS.test(verb) ? verb.toLowerCase() : 'none';
  return `<button type="button" class="api-op-copy" data-copy="${escapeAttr(route)}" aria-label="Скопировать ${escapeAttr(verb)} ${escapeAttr(route)}"><span class="api-op-method api-op-${tone}">${escapeHtml(verb)}</span><span class="api-op-path">${escapeHtml(route)}</span><span class="api-op-hint">Скопировать</span></button>`;
};

const operationPair =
  /<li>\s*<p>метод:\s*([^<]*?)\s*<\/p>\s*<\/li>\s*<li>\s*<p>путь:\s*([^<]*?)\s*<\/p>\s*<\/li>/gi;

const loneOperation =
  /<div class="paragraph">\s*<p>(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^<]+?)\s*<\/p>\s*<\/div>/g;

export const rewriteApiOps = (html: string): string => {
  const withPairs = html.replace(operationPair, (match, method: string, path: string) => {
    if (method.trim() === '' || path.trim() === '') {
      return match;
    }
    return `<li class="api-op-item">${apiOpButton(method, path)}</li>`;
  });
  return withPairs.replace(loneOperation, (_match, method: string, path: string) => {
    return `<div class="api-op">${apiOpButton(method, path)}</div>`;
  });
};

export const linkifyHtml = (html: string): string =>
  html.replace(/>([^<]+)</g, (match, text: string) => {
    const parts = linkifyText(text);
    if (parts.every((part) => part.kind === 'text')) {
      return match;
    }
    const inner = parts
      .map((part) =>
        part.kind === 'text'
          ? escapeHtml(part.value)
          : `<button type="button" class="doc-link" data-path="${escapeAttr(part.value)}">${escapeHtml(part.value)}</button>`,
      )
      .join('');
    return `>${inner}<`;
  });
