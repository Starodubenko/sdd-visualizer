status: done
step: 03
next: done
changed:
  - docs/method/05-docs-repo.md
  - docs/settings/
  - apps/server/test/fixtures/docs/settings/
  - apps/server/src/documents/documents.service.ts
  - apps/server/src/documents/documents.service.test.ts
  - apps/server/src/documents/templates/render-templates.ts
  - apps/server/src/ssr/ssr.controller.ts
  - apps/server/src/ssr/ssr.service.ts
  - apps/web/src/App.tsx
  - apps/web/src/pages/Workspace/WorkspacePage.tsx
  - apps/web/src/shared/ActionsMenu.tsx
  - apps/web/src/shared/api.ts
  - apps/web/src/style.css
checks:
  - "01: diff -rq docs/settings apps/server/test/fixtures/docs/settings empty"
  - "02: npm test --workspace @sdd/server 39/39 PASS"
  - "03: npm test --workspace @sdd/web 37/37 PASS"
  - "03: npm run build --workspace @sdd/web PASS"
  - "03: npm run build --workspace @sdd/server PASS"
  - "03: browser /settings tree, template.md, burger back to /"
keep:
  - docs/settings не проект и не строка селектора
  - создание фичи читает template.* из docs/settings
  - {{feature}} заменяется на feature-id
  - маршрут /settings и пункт бургера Настройки
blocked:
