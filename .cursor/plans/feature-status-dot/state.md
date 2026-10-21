# feature-status-dot

status: done
step: 01
next: done
changed:
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
checks:
  - "01: invoices зелёная точка, order-list янтарная, assets без точки"
keep:
  - Точки у файлов в дереве остаются на месте.
  - Полные метки статуса в карточке документа не меняются.
blocked:
