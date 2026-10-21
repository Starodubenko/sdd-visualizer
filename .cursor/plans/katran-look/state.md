# katran-look

status: done
step: 01
next: done
changed:
  - apps/web/src/style.css
  - apps/web/src/Document.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/pages/Admin/AdminPage.tsx
  - apps/web/src/features/document-view/DocumentView.tsx
checks:
  - "01: светлая оболочка, синие кнопки, пилюли ok/warn, шапка в одну строку"
keep:
  - Поведение дерева, селектора, статусов и админки не меняется.
  - Подписи тегов остаются «В процессе» и «Готово к реализации».
  - Каталоги статуса по-прежнему скрыты.
blocked:
