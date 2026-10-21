export type MarkdownSection = {
  title: string;
  body: string;
};

export type SplitMarkdown = {
  prelude: string;
  sections: MarkdownSection[];
};

export const splitMarkdownSections = (content: string): SplitMarkdown => {
  const lines = content.split('\n');
  const preludeLines: string[] = [];
  const sections: MarkdownSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      sections.push({
        title: currentTitle,
        body: currentBody.join('\n'),
      });
      currentBody = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.slice(3);
      continue;
    }
    if (currentTitle === null) {
      preludeLines.push(line);
    } else {
      currentBody.push(line);
    }
  }
  flush();

  return {
    prelude: preludeLines.join('\n'),
    sections,
  };
};
