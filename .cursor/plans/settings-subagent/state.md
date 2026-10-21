status: done
step: 02
next: done
changed:
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/api.ts
checks:
  - "01: npm test --workspace @sdd/server 50/50 PASS"
  - "02: npm test --workspace @sdd/web 37/37 PASS"
  - "02: npm run build --workspace @sdd/web PASS"
  - "02: browser add probe-part under analyst then delete, section removed"
keep:
  - сабагент лежит внутри каталога агента
  - создание фичи не читает шаблоны сабагентов
  - строка появляется в agent.md родителя
blocked:
