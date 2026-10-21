# status-done

status: done
step: 02
next: done
changed:
  - apps/server/src/documents/paths.ts
  - apps/server/src/documents/feature-status.ts
  - apps/server/src/documents/tree.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/test/fixtures/docs/payments/order-list/done/обзор.md
  - docs/method/README.md
  - docs/method/01-theory.md
  - docs/method/02-maturity.md
  - docs/method/03-transitions.md
  - docs/method/04-roles.md
  - docs/method/05-docs-repo.md
  - .cursor/rules/00-project-context.mdc
  - apps/web/src/shared/api.ts
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/doc-links.ts
  - apps/web/src/features/document-view/doc-links.test.ts
  - apps/web/src/style.css
checks:
  - "01: done — третий каталог; смесь ready и done оставляет фичу ready; все пять done — фича done"
  - "02: точка и тег «Выполнено» индиго; меню предлагает остальные статусы и спрашивает подтверждение"
changed:
  - apps/server/src/documents/paths.ts
  - apps/server/src/documents/feature-status.ts
  - apps/server/src/documents/tree.ts
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/test/fixtures/docs/payments/order-list/done/обзор.md
  - docs/method/README.md
  - docs/method/01-theory.md
  - docs/method/02-maturity.md
  - docs/method/03-transitions.md
  - docs/method/04-roles.md
  - docs/method/05-docs-repo.md
  - .cursor/rules/00-project-context.mdc
checks:
  - "01: done — третий каталог; смесь ready и done оставляет фичу ready; все пять done — фича done"
keep:
  - Каталоги статуса скрыты, файлы сливаются в фичу.
  - Новая фича по-прежнему создаётся в `in-progress`.
blocked:
