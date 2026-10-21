# 01 — Метод

role: architect
next: 02

## Read

- `.cursor/plans/status-dirs-hidden/SPEC.md`
- `.cursor/plans/status-dirs-hidden/state.md`
- `docs/method/README.md`
- `docs/method/01-theory.md`
- `docs/method/02-maturity.md`
- `docs/method/03-transitions.md`
- `docs/method/04-roles.md`
- `docs/method/05-docs-repo.md`
- `.cursor/rules/00-project-context.mdc`

## Do

Заменить каталоги статуса `в-процессе` и `готово-к-реализации` на `in-progress` и `ready-to-implement` во всех перечисленных файлах.

В `docs/method/05-docs-repo.md` в блоке «Директория фичи» оставить схему с новыми именами и дописать: визуализатор эти два каталога не показывает; статус на экране — цветной тег «В процессе» или «Готово к реализации».

В `.cursor/rules/00-project-context.mdc` обновить путь фичи на `docs/<проект>/<фича>/{in-progress|ready-to-implement}/`.

## Do not

- Не менять `apps/`.
- Не переименовывать фикстуры.
- Не менять критерии AN, DS, BE, QA, FE.

## Done when

- В `docs/method/` и в `00-project-context.mdc` нет строк `в-процессе` и `готово-к-реализации`.
- `05-docs-repo.md` содержит `in-progress`, `ready-to-implement` и фразу про цветной тег.
