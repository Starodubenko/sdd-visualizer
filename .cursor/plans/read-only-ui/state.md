# read-only-ui

status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/TaskForm.tsx
  - apps/web/src/shared/api.ts
  - apps/web/src/pages/Admin/AdminPage.tsx
checks:
  - "01: в интерфейсе нет сохранения, смены статуса, создания, удаления и публикации"
keep:
  - Дерево, статусы, секции и ссылки на фрагменты остаются.
  - Серверные маршруты записи не трогать.
blocked:
