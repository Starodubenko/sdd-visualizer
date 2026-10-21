# 01 — Дерево проекта

role: developer
next: done

## Read

- `.cursor/plans/project-tree/SPEC.md`
- `.cursor/plans/project-tree/state.md`
- `apps/web/src/pages/Workspace/WorkspacePage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/shared/api.ts`
- `apps/server/src/ssr/ssr.service.ts`

## Do

- Дерево рисует только детей `docs/<выбранный проект>`. Корня `docs`, имени проекта, других проектов и `method` в дереве нет.
- Смена селектора заменяет этот список и открывает справа каталог выбранного проекта.
- Первый рендер берёт фичи первого проекта из данных SSR, а не весь список `docs`.
- После добавления и удаления фичи дерево выбранного проекта обновляется.
- Раскрытие фичи по-прежнему показывает слитые файлы и `assets`.

## Do not

- Не менять метод, правила и фикстуры.
- Не коммитить.
- Не возвращать в дерево каталоги `in-progress` и `ready-to-implement`.

## Done when

- `npm test -w @sdd/web` проходит.
- В `WorkspacePage` дерево не начинается с узла `docs`.
- SSR-данные рабочего экрана содержат записи первого проекта.
