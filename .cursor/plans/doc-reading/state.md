# doc-reading

status: done
step: 02
next: done
changed:
  - apps/web/src/features/document-view/markdown-sections.ts
  - apps/web/src/features/document-view/markdown-sections.test.ts
  - apps/web/src/features/document-view/doc-links.ts
  - apps/web/src/features/document-view/doc-links.test.ts
  - apps/web/src/features/document-view/text-fragment.ts
  - apps/web/src/features/document-view/text-fragment.test.ts
  - apps/web/src/features/document-view/highlight-text.ts
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: секции ## и ключи yaml — коллапсеры; имена файлов открывают документ"
  - "02: выделение копирует ссылку #t=; клик открывает файл, раскрывает секцию, прокручивает и подсвечивает текст"
changed:
  - apps/web/src/features/document-view/markdown-sections.ts
  - apps/web/src/features/document-view/markdown-sections.test.ts
  - apps/web/src/features/document-view/doc-links.ts
  - apps/web/src/features/document-view/doc-links.test.ts
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: секции ## и ключи yaml — коллапсеры; имена файлов открывают документ, при промахе статуса пробуется второй каталог"
keep:
  - Картинки `../assets/` по-прежнему грузятся через `/api/raw`.
  - Меню документа, исходный текст и строка задачи остаются модалками.
  - Точки статуса в дереве не меняются.
blocked:
