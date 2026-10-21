# 01 — Стили Katran

role: developer
next: done

## Read

- `.cursor/plans/katran-look/SPEC.md`
- `apps/web/src/style.css`
- `apps/web/src/Document.tsx`
- `apps/web/src/pages/Workspace/WorkspacePage.tsx`
- `apps/web/src/pages/Admin/AdminPage.tsx`
- `apps/web/src/features/document-view/DocumentView.tsx`
- `/Users/rodionstarodubenko/Projects/katran/apps/demo/src/Shell.tsx`
- `/Users/rodionstarodubenko/Projects/katran/packages/ui/src/button/Button.tsx`
- `/Users/rodionstarodubenko/Projects/katran/packages/ui/src/value/value.hot.ts` (блок `.k-badge`)

## Do

Перекрасить визуализатор по SPEC.

- В `Document.tsx` подключить IBM Plex Sans (400, 500, 600, 700) и IBM Plex Mono (400, 500) с Google Fonts.
- Переписать `apps/web/src/style.css`: токены SPEC, оболочка как Shell (светлая шапка, белая колонка, холст ground), кнопки ghost и primary, поля ввода, строки дерева, пилюли статусов с точкой, markdown и yaml на `sunk` и `line`.
- Класс `primary` поставить на кнопки «Добавить», «Опубликовать» и «Сохранить» в рабочем экране, документе и админке. «Удалить» остаётся ghost.
- Строки `.tree-row` не получают рамку обычной кнопки.

## Do not

- Не добавлять зависимость `@katran/ui` или styled-components.
- Не менять сервер, фикстуры, метод и логику дерева.
- Не коммитить.

## Done when

- `npm test -w @sdd/web` проходит.
- В `style.css` нет `#1f3a34` и шрифта Georgia/Palatino.
- Есть классы `.status-tag-in-progress` и `.status-tag-ready` с разными фонами `warn-soft` и `ok-soft`.
