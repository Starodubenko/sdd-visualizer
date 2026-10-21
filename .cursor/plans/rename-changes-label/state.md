status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - docs/method/05-docs-repo.md
checks:
  - "01: npm test -w @sdd/web 34/34 PASS"
  - "01: npm run build -w @sdd/web PASS"
  - "01: invoices tag, filter, and analyst column say Внесены изменения"
keep:
  - кнопки «Последние изменения» и «Текущие изменения» не меняются
blocked:
