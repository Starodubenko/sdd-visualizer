import { parse } from 'yaml';

export type YamlCase = {
  id: string;
  title: string;
  surface: string;
};

export const readCases = (content: string): YamlCase[] => {
  try {
    const parsed = parse(content) as { cases?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.cases)) {
      return [];
    }
    return parsed.cases.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const record = item as { id?: unknown; title?: unknown; surface?: unknown };
      if (typeof record.id !== 'string') {
        return [];
      }
      return [
        {
          id: record.id,
          title: typeof record.title === 'string' ? record.title : '',
          surface: typeof record.surface === 'string' ? record.surface : '',
        },
      ];
    });
  } catch {
    return [];
  }
};
