status: done
step: 02
next: done
changed:
  - apps/server/src/git-root.ts
  - apps/server/src/publish/docs-tree-sync.ts
  - apps/server/src/publish/sync.service.ts
  - apps/server/src/publish/publish.service.ts
  - apps/server/src/publish/publish.module.ts
  - apps/server/src/publish/sync.service.test.ts
  - apps/server/src/publish/publish.service.test.ts
  - apps/server/src/ssr/ssr.service.ts
  - apps/server/src/ssr/ssr.controller.ts
  - apps/server/src/ssr/ssr.module.ts
  - apps/server/src/app.module.ts
  - apps/server/package.json
  - README.md
  - apps/web/src/App.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/api.ts
checks:
  - "01: npm test -w @sdd/server 28/28 PASS"
  - "01: npm run build -w @sdd/server PASS"
  - "02: npm test -w @sdd/web 36/36 PASS"
  - "02: npm run build -w @sdd/web PASS"
keep:
  - конфликт по-прежнему не сливается и не затирает локальные правки
  - каталог global не показывается в дереве
blocked:
