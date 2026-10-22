status: done
step: 02
next: done
changed:
  - apps/server/package.json
  - apps/server/src/ssr/ssr.controller.ts
  - apps/server/src/ssr/ssr.service.ts
  - apps/server/src/ssr/ssr.service.test.ts
  - apps/web/src/App.tsx
  - apps/web/src/Document.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/api.ts
checks:
  - "01: npm test --workspace @sdd/server 63/63 PASS, methodData ok"
  - "02: npm test --workspace @sdd/web 54/54 PASS"
  - "02: npm run build --workspace @sdd/web PASS"
  - "02: npm run build --workspace @sdd/server PASS"
  - "02: browser / burger Теория, /method files and 01-theory.adoc, /settings keeps project selector"
keep:
  - method не строка селектора проектов
  - маршрут /settings и пункт бургера Настройки
  - корень теории docs/method
  - GET /method и page method с корнем docs/method
  - селектор проекта остаётся на документации и настройках
blocked:
