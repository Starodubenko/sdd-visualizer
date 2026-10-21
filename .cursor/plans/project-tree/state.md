# project-tree

status: done
step: 01
next: done
changed:
  - apps/server/src/ssr/ssr.service.ts
  - apps/web/src/shared/api.ts
  - apps/web/src/App.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
checks:
  - "01: npm test -w @sdd/web — 6 pass"
  - "01: при billing в дереве только invoices, при payments — order-list и payment-card"
keep:
  - Каталоги in-progress и ready-to-implement в дереве не показываются.
  - Файлы фичи остаются слитыми в каталог фичи, с цветными тегами.
  - method не является проектом и в селектор не попадает.
blocked:
