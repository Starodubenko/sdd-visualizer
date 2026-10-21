status: done
step: 02
next: done
changed:
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - docs/method/05-docs-repo.md
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
  - apps/web/src/features/document-view/CollapserSummary.tsx
checks:
  - "01: npm test -w @sdd/server 20/20 PASS"
  - "01: npm run build -w @sdd/server PASS"
  - "02: npm test -w @sdd/web 35/35 PASS"
  - "02: npm run build -w @sdd/web PASS"
keep:
  - «Текущие изменения» и «Последние изменения» остаются
  - перенос ключевых файлов между каталогами статуса не меняется
blocked:
