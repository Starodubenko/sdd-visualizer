status: done
step: 01
next: done
changed:
  - apps/web/src/features/document-view/doc-links.ts
  - apps/web/src/features/document-view/doc-links.test.ts
  - apps/web/src/features/document-view/DocumentView.tsx
checks:
  - "01: npm test -w @sdd/web 24/24 PASS"
  - "01: клик analyst.md в файле изменения открывает billing/invoices/analyst.md и подсвечивает Результат"
keep:
  - ссылки из обычных спек ищутся как раньше
blocked:
