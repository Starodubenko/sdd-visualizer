# tree-status-dot

status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: в дереве точка 8px у правого края; warn для в процессе, ok для готово; полные метки справа на месте"
keep:
  - Полные цветные метки статуса остаются в шапке документа и в списке файлов справа.
  - Цвета warn и ok не меняются.
blocked:
