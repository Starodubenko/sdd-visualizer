export const formatUpdateTimestamp = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
};

export const sectionSlug = (section: string): string =>
  section
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const basenameWithoutExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) {
    return fileName;
  }
  return fileName.slice(0, dot);
};
