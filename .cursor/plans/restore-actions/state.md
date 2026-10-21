status: done
step: 01
next: done
changed:
  - apps/web/src/shared/api.ts
  - apps/web/src/shared/ActionsMenu.tsx
  - apps/web/src/shared/ConfirmModal.tsx
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/pages/Admin/AdminPage.tsx
checks:
  - "01: npm test -w @sdd/web 21/21 PASS"
  - "01: создание фичи, перенос analyst.md, удаление фичи, админка без записи токена"
keep:
  - текст документа с экрана не пишется
  - токен в форму не подставляется
blocked:
