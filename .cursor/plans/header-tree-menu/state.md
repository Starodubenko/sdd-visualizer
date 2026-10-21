# header-tree-menu

status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/pages/Admin/AdminPage.tsx
  - apps/web/src/style.css
  - apps/web/src/features/document-view/DocumentView.tsx
checks:
  - "01: крошка billing/invoices/analyst.md, меню «Действия» справа от «Исходный текст», дерево под шапкой"
keep:
  - Тёмная и светлая темы и переключатель остаются.
  - Селектор по-прежнему ограничивает дерево одним проектом.
blocked:
