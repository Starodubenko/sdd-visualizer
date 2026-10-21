status: done
step: 04
next: done
changed:
  - apps/server/src/publish/sync.service.ts
  - apps/server/src/publish/sync.service.test.ts
  - apps/server/src/publish/publish.controller.ts
  - apps/server/src/publish/publish.module.ts
  - apps/server/src/documents/watch-path-filter.ts
  - apps/server/src/documents/watch-path-filter.test.ts
  - apps/server/src/documents/documents-events.service.ts
  - apps/server/src/documents/documents.module.ts
  - apps/server/src/documents/documents.controller.ts
  - apps/web/src/shared/api.ts
  - apps/web/src/pages/Workspace/formatSyncCountdown.ts
  - apps/web/src/pages/Workspace/formatSyncCountdown.test.ts
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/style.css
checks:
  - "01: npm test -w @sdd/server 26/26 PASS"
  - "01: npm run build -w @sdd/server PASS"
  - "02: npm test -w @sdd/server 29/29 PASS"
  - "02: npm run build -w @sdd/server PASS"
  - "03: npm test -w @sdd/web 36/36 PASS"
  - "03: npm run build -w @sdd/web PASS"
  - "04: npm test -w @sdd/web 36/36 PASS"
  - "04: npm run build -w @sdd/web PASS"
keep:
  - публикация по-прежнему коммитит и пушит только docs/<проект>
  - токен не попадает в ответ и в текст ошибки
blocked:
