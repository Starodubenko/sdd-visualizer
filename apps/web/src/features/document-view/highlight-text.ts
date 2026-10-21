import { normalizeFragment } from './text-fragment';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE']);

const collectTextNodes = (root: HTMLElement): Text[] => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    const parent = text.parentElement;
    if (parent && !SKIP_TAGS.has(parent.tagName) && !parent.closest('script, style')) {
      if (text.data.length > 0) {
        nodes.push(text);
      }
    }
    current = walker.nextNode();
  }
  return nodes;
};

export const clearHighlight = (root: HTMLElement): void => {
  root.querySelectorAll('mark.text-hit').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    mark.remove();
  });
};

const openAncestorDetails = (element: HTMLElement, root: HTMLElement): void => {
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    if (node.tagName === 'DETAILS') {
      (node as HTMLDetailsElement).open = true;
    }
    node = node.parentElement;
  }
};

export const highlightFragment = (root: HTMLElement, text: string): HTMLElement | null => {
  const query = normalizeFragment(text);
  if (!query) {
    return null;
  }

  const nodes = collectTextNodes(root);
  let normalized = '';
  const indexMap: Array<{ node: Text; offset: number }> = [];

  for (const node of nodes) {
    const data = node.data;
    for (let offset = 0; offset < data.length; offset += 1) {
      const ch = data[offset];
      if (/\s/.test(ch)) {
        if (normalized.length === 0 || normalized[normalized.length - 1] !== ' ') {
          normalized += ' ';
          indexMap.push({ node, offset });
        }
      } else {
        normalized += ch;
        indexMap.push({ node, offset });
      }
    }
  }

  const matchAt = normalized.indexOf(query);
  if (matchAt === -1) {
    return null;
  }

  const start = indexMap[matchAt];
  const end = indexMap[matchAt + query.length - 1];
  if (!start || !end) {
    return null;
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset + 1);

  const mark = document.createElement('mark');
  mark.className = 'text-hit';
  try {
    range.surroundContents(mark);
  } catch {
    const contents = range.extractContents();
    mark.appendChild(contents);
    range.insertNode(mark);
  }

  openAncestorDetails(mark, root);
  return mark;
};
