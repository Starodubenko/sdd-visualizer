# action-modals

status: done
step: 01
next: done
changed:
  - apps/web/src/shared/Modal.tsx
  - apps/web/src/style.css
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/features/document-view/TaskForm.tsx
  - apps/web/src/pages/Admin/AdminPage.tsx
checks:
  - "01: новая фича и исходный текст — модалки ввода; удаление, публикация, статус и сохранение админки — подтверждение"
keep:
  - Меню закрываются по клику снаружи.
  - Темы и раскладка шапки над деревом не меняются.
blocked:
