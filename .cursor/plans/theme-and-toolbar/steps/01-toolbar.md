# 01 — Тема и панель

role: developer
next: done

## Read

- `.cursor/plans/theme-and-toolbar/SPEC.md`
- `apps/web/src/style.css`
- `apps/web/src/Document.tsx`
- `apps/web/src/pages/Workspace/WorkspacePage.tsx`
- `apps/web/src/pages/Admin/AdminPage.tsx`
- `apps/web/src/features/document-view/DocumentView.tsx`

## Do

Светлая и тёмная темы, переключатель, одна верхняя панель действий над карточкой контента. Подробности в промпте шага.

## Do not

- Не менять сервер, фикстуры и метод.
- Не коммитить.
- Не подключать `@katran/ui`.

## Done when

- `npm test -w @sdd/web` проходит.
- В CSS есть тёмные значения `#0e121a` и `#161b26`.
- Кнопки «Добавить», «Удалить» и «Опубликовать» не стоят внутри дерева и не стоят под текстом документа.
