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
  - "01: npm test --workspace @sdd/server 43/43 PASS"
  - "02: npm test --workspace @sdd/web 37/37 PASS"
  - "02: npm run build --workspace @sdd/web PASS"
  - "02: browser create probe-agent then delete, orchestrator row added and removed"
keep:
  - имя агента — kebab-case
  - создание пишет template.md, agent.md и строку оркестратора
  - удаление убирает каталог и эту строку
blocked:
