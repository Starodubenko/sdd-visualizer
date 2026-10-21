status: done
step: 03
next:
changed:
  - docs/method
  - docs/billing/main
  - docs/payments/main
  - apps/server/test/fixtures/docs/billing/main
  - apps/server/test/fixtures/docs/payments/main
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/publish/publish.service.test.ts
  - apps/server/src/publish/sync.service.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/shared/api.ts
  - apps/web/src/style.css
checks:
  - "02: npm test --workspace @sdd/server 60/60 PASS"
  - "03: npm test --workspace @sdd/web 39/39 PASS"
keep:
  - settings не эпик и не виден в дереве документации
  - шаблоны фичи читаются из docs/<проект>/settings
  - текст агента остаётся settings/<имя>/ без имени проекта
  - каталоги статуса по-прежнему скрыты, статус — цветной тег
blocked:
