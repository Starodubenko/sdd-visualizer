status: done
step: 01
next: done
changed:
  - apps/web/src/features/document-view/collapser-updates.ts
  - apps/web/src/features/document-view/collapser-updates.test.ts
  - apps/web/src/features/document-view/DocumentView.tsx
checks:
  - "01: npm test -w @sdd/web 35/35 PASS"
  - "01: npm run build -w @sdd/web PASS"
  - "01: backend.md bar shows Готово к реализации and Внесены изменения; designer.md does not"
keep:
  - статус каталога в строке документа остаётся
  - меню переноса статуса не предлагает «Внесены изменения»
blocked:
