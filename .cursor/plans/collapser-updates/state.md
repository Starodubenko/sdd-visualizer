status: done
step: 02
next: done
changed:
  - apps/server/src/documents/update-filename.ts
  - apps/server/src/documents/render-update-file.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/web/src/features/document-view/collapser-updates.ts
  - apps/web/src/features/document-view/collapser-updates.test.ts
  - apps/web/src/features/document-view/CollapserSummary.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
  - apps/web/src/shared/api.ts
  - apps/web/src/style.css
checks:
  - "01: POST /api/updates создаёт файл в updates/in-progress и не меняет спеку"
  - "01: npm test -w @sdd/server 16/16 PASS"
  - "02: npm test -w @sdd/web 31/31 PASS"
  - "02: у «Вне задачи» дата 20.10.2026 открывает файл изменения и блок «Правка»"
keep:
  - исходный текст спеки эта кнопка не меняет
  - дата только у применённых изменений из updates/done
blocked:
