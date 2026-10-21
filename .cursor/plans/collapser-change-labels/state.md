status: done
step: 01
next: done
changed:
  - apps/web/src/features/document-view/collapser-updates.ts
  - apps/web/src/features/document-view/collapser-updates.test.ts
  - apps/web/src/features/document-view/CollapserSummary.tsx
  - apps/web/src/features/document-view/MarkdownView.tsx
  - apps/web/src/features/document-view/YamlView.tsx
checks:
  - "01: npm test -w @sdd/web 33/33 PASS"
  - "01: npm run build -w @sdd/web PASS"
  - "01: Результат shows Последние изменения 21.10.2026 and Текущие изменения"
keep:
  - подсветка шапки незакрытого блока остаётся
  - дата без применённого изменения не показывается
blocked:
