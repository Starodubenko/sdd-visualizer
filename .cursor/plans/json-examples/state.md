status: done
step: 02
next: done
changed:
  - apps/web/src/features/document-view/json-highlight.ts
  - apps/web/src/features/document-view/json-highlight.test.ts
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/style.css
  - docs/method/05-docs-repo.md
  - apps/server/src/documents/templates/render-templates.ts
  - apps/server/test/fixtures/docs/payments/order-list/ready-to-implement/backend.md
  - apps/server/test/fixtures/docs/payments/payment-card/in-progress/backend.md
  - apps/server/test/fixtures/docs/billing/invoices/ready-to-implement/backend.md
checks:
  - "01: language-json красится токенами; битый JSON остаётся обычным кодом"
  - "02: в backend.md есть «Пример запроса» и «Пример ответа» с валидным JSON"
keep:
  - примеры только в backend
  - поля примера совпадают с таблицами этого файла
blocked:
