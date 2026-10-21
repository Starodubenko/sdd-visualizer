status: done
step: 01
next: done
changed:
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/documents/parse-update-file.ts
  - apps/server/src/documents/markdown-section.ts
  - apps/web/src/features/document-view/DocumentView.tsx
checks:
  - "01: npm test -w @sdd/server 18/18 PASS"
  - "01: файл изменения переносится в updates/done и секция спеки получает текст Правка"
keep:
  - смена статуса ключевых файлов остаётся прежней
blocked:
