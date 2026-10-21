status: done
step: 02
next: done
changed:
  - apps/server/src/documents/paths.ts
  - apps/server/src/documents/feature-status.ts
  - apps/server/src/documents/feature-status.test.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/documents/tree.ts
  - docs/method/05-docs-repo.md
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/shared/api.ts
  - apps/web/src/style.css
  - apps/web/src/features/document-view/collapser-updates.ts
  - apps/web/src/features/document-view/collapser-updates.test.ts
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
checks:
  - "01: npm test -w @sdd/server 19/19 PASS"
  - "01: npm run build -w @sdd/server PASS"
  - "02: npm test -w @sdd/web 32/32 PASS"
  - "02: npm run build -w @sdd/web PASS"
  - "02: invoices feature status changes, Результат header --bad-soft"
keep:
  - тег файла по-прежнему берётся из каталога, где лежит файл
  - «Выполнено» у файла изменения по-прежнему применяет «Правка» и переносит файл в updates/done
  - меню статуса не предлагает «Требуется изменение» как перенос
blocked:
