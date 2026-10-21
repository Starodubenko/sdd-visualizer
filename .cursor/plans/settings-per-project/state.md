status: done
step: 03
next:
changed:
  - docs/method/05-docs-repo.md
  - docs/billing/settings
  - docs/payments/settings
  - apps/server/test/fixtures/docs/billing/settings
  - apps/server/test/fixtures/docs/payments/settings
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/ssr/ssr.service.ts
  - apps/server/src/ssr/ssr.controller.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/api.ts
  - apps/web/src/App.tsx
checks:
  - "02: npm test --workspace @sdd/server 54/54 PASS"
  - "03: npm test --workspace @sdd/web 37/37 PASS"
keep:
  - путь в тексте агента — settings/<имя>/, без имени проекта
  - каталог settings не виден в дереве фич
  - создание фичи читает настройки своего проекта
blocked:
