# 03 — Цветные теги

role: developer
next: done

## Read

- `.cursor/plans/status-dirs-hidden/SPEC.md`
- `.cursor/plans/status-dirs-hidden/state.md`
- `.cursor/plans/status-dirs-hidden/steps/03-tags.md`
- `apps/web/src/pages/Workspace/WorkspacePage.tsx`
- `apps/web/src/pages/Workspace/tree-window.ts`
- `apps/web/src/pages/Workspace/tree-window.test.ts`
- `apps/web/src/features/document-view/DocumentView.tsx`
- `apps/web/src/shared/api.ts`
- `apps/web/src/style.css`

## Do

- Типы дерева и файла фичи принимают необязательные `status` и `path`, как их отдаёт сервер после шага 02.
- Каталог фичи на UI — это слияние. И дерево, и правая панель берут `entries` фичи, а не отдельный список из пяти ключевых файлов. В этом списке есть каждый файл из `in-progress` и `ready-to-implement` (`analyst.md`, `обзор.md`, `large.md`, `tester.yaml` и остальные), плюс соседние каталоги вроде `assets`. Имён `in-progress` и `ready-to-implement` в списке нет.
- Файл открывается по `entry.path`. Рядом с именем файла, у которого есть `status`, — цветной тег. Тег фичи остаётся у заголовка фичи.
- В заголовке документа сегменты `/in-progress/` и `/ready-to-implement/` не показываются. Тег статуса остаётся. Кнопка смены статуса работает.
- Классы: `status-tag`, `status-tag-in-progress` (`#e8a317` / `#3d2914`), `status-tag-ready` (`#1f7a4d` / `#f6f4ef`). Подписи: «В процессе» и «Готово к реализации».
- Обновить тест `resolveRelative`, если путь ещё содержит старое имя каталога.

## Do not

- Не менять сервер, фикстуры, метод и правила.
- Не коммитить.

## Done when

- `npm test -w @sdd/web` проходит.
- В `apps/web/src` нет строк `в-процессе` и `готово-к-реализации`.
- Оба статуса используют разные цветные классы тега.
- Правая панель фичи и дерево показывают файлы из обоих каталогов статуса как содержимое фичи.
