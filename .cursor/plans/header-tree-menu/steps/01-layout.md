# 01 — Крошки, меню, шапка

role: developer
next: done

## Read

- `.cursor/plans/header-tree-menu/SPEC.md`
- `apps/web/src/pages/Workspace/tree-window.ts`
- `apps/web/src/pages/Workspace/tree-window.test.ts`
- `apps/web/src/pages/Workspace/WorkspacePage.tsx`
- `apps/web/src/pages/Admin/AdminPage.tsx`
- `apps/web/src/features/document-view/DocumentView.tsx`
- `apps/web/src/style.css`

## Do

Сделать три правки из SPEC. Подробности в промпте шага.

## Do not

- Не менять сервер и фикстуры.
- Не коммитить.

## Done when

- `npm test -w @sdd/web` проходит.
- `displayDocumentPath('docs/payments/order-list/in-progress/analyst.md')` равен `payments/order-list/analyst.md`.
- Шапка — первая строка сетки на всю ширину, дерево — вторая строка слева.
