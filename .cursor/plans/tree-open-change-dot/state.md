status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: npm test -w @sdd/web 35/35 PASS"
  - "01: npm run build -w @sdd/web PASS"
  - "01: analyst.md and backend.md show green and red dots; designer.md shows only green; invoices stays one red dot"
keep:
  - точка статуса каталога остаётся
  - точка фичи не дублируется
blocked:
