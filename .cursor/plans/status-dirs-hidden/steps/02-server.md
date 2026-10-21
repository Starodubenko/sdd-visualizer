# 02 — Сервер и фикстуры

role: developer
next: 03

## Read

- `.cursor/plans/status-dirs-hidden/SPEC.md`
- `.cursor/plans/status-dirs-hidden/state.md`
- `.cursor/plans/status-dirs-hidden/steps/02-server.md`
- `apps/server/src/documents/paths.ts`
- `apps/server/src/documents/documents.service.ts`
- `apps/server/src/documents/tree.ts`
- `apps/server/src/documents/feature-status.ts`
- `apps/server/src/documents/documents.service.test.ts`
- `apps/server/src/publish/publish.service.test.ts`

## Do

- Константы каталогов: `in-progress` и `ready-to-implement`.
- Переименовать эти каталоги в `apps/server/test/fixtures` (`git mv` или `mv`). Содержимое файлов не переписывать. `large.md` не трогать.
- `list` для каталога фичи не возвращает имена `in-progress` и `ready-to-implement`. Вместо них возвращает файлы из обоих каталогов. У такого файла в записи есть `status` (`in_progress` или `ready`) и `path` (`docs/<проект>/<фича>/<каталог>/<файл>`). Остальные соседи, включая `assets`, остаются как есть.
- `describe` каталога фичи в `entries` тоже не кладёт эти два каталога. У файлов фичи в `files` есть `path`.
- Прямое чтение `docs/.../in-progress/analyst.md` и перенос статуса продолжают работать.
- Обновить серверные тесты на новые пути. Добавить проверку: список `docs/payments/order-list` содержит `large.md` и не содержит строк `in-progress`, `ready-to-implement` и `UNIQUE_LARGE_BODY_SENTINEL`.

## Do not

- Не менять `apps/web`.
- Не менять `docs/method` и `.cursor/rules`.
- Не коммитить.

## Done when

- `npm test -w @sdd/server` проходит.
- В `apps/server/src` нет строк `в-процессе` и `готово-к-реализации`.
