# status-dirs-hidden

status: done
step: 03
next: done
changed:
  - docs/method/README.md
  - docs/method/01-theory.md
  - docs/method/02-maturity.md
  - docs/method/03-transitions.md
  - docs/method/04-roles.md
  - docs/method/05-docs-repo.md
  - .cursor/rules/00-project-context.mdc
  - apps/server/src/documents/paths.ts
  - apps/server/src/documents/tree.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/feature-status.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/publish/publish.service.test.ts
  - apps/server/test/fixtures/docs/billing/invoices/in-progress
  - apps/server/test/fixtures/docs/billing/invoices/ready-to-implement
  - apps/server/test/fixtures/docs/payments/order-list/in-progress
  - apps/server/test/fixtures/docs/payments/order-list/ready-to-implement
  - apps/server/test/fixtures/docs/payments/payment-card/in-progress
  - apps/server/test/fixtures/docs/payments/payment-card/ready-to-implement
  - apps/web/src/shared/api.ts
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/style.css
checks:
  - "01: в docs/method и 00-project-context нет в-процессе и готово-к-реализации"
  - "01: 05-docs-repo называет in-progress, ready-to-implement и цветной тег"
  - "02: npm test -w @sdd/server — 9 pass"
  - "02: apps/server/src без в-процессе и готово-к-реализации"
  - "02: список docs/payments/order-list не содержит каталоги статуса и содержит large.md"
  - "03: npm test -w @sdd/web — 6 pass"
  - "03: дерево и панель фичи сливают файлы обоих каталогов, теги цветные, заголовок файла без имени каталога статуса"
keep:
  - Пять ключевых файлов и вычисление готовности фичи не меняются.
  - Каталог global по-прежнему скрыт и не попадает в API.
  - large.md и UNIQUE_LARGE_BODY_SENTINEL остаются на месте, тело файла в дерево не попадает.
  - Подписи тегов остаются русскими.
blocked:
