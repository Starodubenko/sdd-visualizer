status: done
step: 02
next: done
changed:
  - apps/server/src/documents/tree.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/web/src/shared/api.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: npm test -w @sdd/server 20/20 PASS"
  - "01: npm run build -w @sdd/server PASS"
  - "02: npm test -w @sdd/web 34/34 PASS"
  - "02: npm run build -w @sdd/web PASS"
  - "02: analyst.md shows catalog tag and Требуется изменение in column 3"
keep:
  - статус каталога файла не заменяется
  - статус фичи по-прежнему changes, если есть любой файл в updates/in-progress
blocked:
