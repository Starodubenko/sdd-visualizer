export const renderUpdateFile = (
  sourceFileName: string,
  sectionTitle: string,
  body: string,
): string => `source: ${sourceFileName}
section: ${sectionTitle}

== Оригинал

${body}

== Правка

${body}
`;
