const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
]);

export const isImagePath = (path: string): boolean => {
  const name = path.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) {
    return false;
  }
  return IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
};

export const imageRawHref = (path: string): string =>
  `/api/raw?path=${encodeURIComponent(path)}`;
