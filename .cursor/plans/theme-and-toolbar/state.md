# theme-and-toolbar

status: done
step: 01
next: done
changed:
  - apps/web/src/style.css
  - apps/web/src/Document.tsx
  - apps/web/src/features/theme/ThemeSwitch.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/pages/Admin/AdminPage.tsx
checks:
  - "01: тёмная тема включается кнопкой «Тёмная», действия стоят в верхней панели"
keep:
  - Светлая палитра Katran остаётся темой по умолчанию.
  - Подписи статусов и скрытые каталоги статуса не меняются.
  - Селектор по-прежнему показывает только фичи выбранного проекта.
blocked:
