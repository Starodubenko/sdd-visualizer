export const DOCS_CHANGED_EVENT = 'sdd-docs-changed';

export type DocsChangedDetail = {
  paths: string[];
};

export const publishDocsChanged = (paths: string[]): void => {
  window.dispatchEvent(
    new CustomEvent<DocsChangedDetail>(DOCS_CHANGED_EVENT, { detail: { paths } }),
  );
};

export const onDocsChanged = (listener: (paths: string[]) => void): (() => void) => {
  const handle = (event: Event) => {
    const detail = (event as CustomEvent<DocsChangedDetail>).detail;
    if (!detail || !Array.isArray(detail.paths)) {
      return;
    }
    listener(detail.paths);
  };
  window.addEventListener(DOCS_CHANGED_EVENT, handle);
  return () => window.removeEventListener(DOCS_CHANGED_EVENT, handle);
};
