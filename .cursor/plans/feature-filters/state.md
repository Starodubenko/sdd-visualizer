status: done
step: 01
next: done
changed:
  - apps/web/src/pages/Workspace/tree-window.ts
  - apps/web/src/pages/Workspace/tree-window.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: npm test -w @sdd/web 34/34 PASS"
  - "01: npm run build -w @sdd/web PASS"
  - "01: name and status filters hide features immediately; open document stays"
keep:
  - файлы внутри фичи не фильтруются
  - открытый документ не закрывается из-за фильтра
blocked:
