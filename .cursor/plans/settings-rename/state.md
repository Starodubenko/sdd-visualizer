status: done
step: 02
next:
changed:
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/api.ts
checks:
  - "01: npm test --workspace @sdd/server 54/54 PASS"
  - "02: npm test --workspace @sdd/web 37/37 PASS"
  - "browser: rename and delete confirms on agent and subagent content; tree updates after subagent rename"
keep:
  - переименование агента двигает каталог и строку оркестратора
  - расширение файла в оркестраторе сохраняется
  - переименование сабагента не трогает оркестратор
blocked:
