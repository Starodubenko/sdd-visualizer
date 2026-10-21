# 01 — Правила агентов

role: developer
next: 02

## Read

- `.cursor/plans/react-nest-ssr-postgres/SPEC.md`
- `.cursor/plans/react-nest-ssr-postgres/state.md`
- `.cursor/rules/00-project-context.mdc`
- `.cursor/rules/25-codegen-and-generators.mdc`
- `.cursor/rules/30-architect-rule.mdc`
- `.cursor/rules/40-designer-rule.mdc`
- `.cursor/rules/50-validator-rule.mdc`
- `.cursor/rules/60-developer-rule.mdc`
- `.cursor/rules/70-integrator-rule.mdc`
- `.cursor/rules/62-no-re-exports.mdc`
- `.cursor/rules/66-colocated-unit-folder-and-readme-index.mdc`
- `.cursor/rules/67-table-column-ordinals.mdc`

## Do

Переписать перечисленные правила так, чтобы агент собирал приложение на React + Nest SSR + PostgreSQL по SPEC.

- `00-project-context.mdc`: этот репозиторий — метод SDD. Целевое приложение — React, Nest SSR (`renderToPipeableStream`), PostgreSQL через TypeORM. Явно отменить стек родительских правил: Effector, Admiral DS, Orval, Craco, Module Federation, словари Omni. Код приложения в этот репозиторий не класть.
- `25-codegen-and-generators.mdc`: генераторы стека — Nest CLI для модуля, TypeORM migration для схемы, сборка React для SSR. Убрать Orval, Craco, `api-generate`, `generate:test` Omni.
- `30-architect-rule.mdc`: слои `apps/web` и `apps/server` из SPEC, поток страница → SSR → сервис → TypeORM → PostgreSQL. Без react-query, axios и Orval.
- `40-designer-rule.mdc`: экраны React, которые первый раз рисует Nest SSR. Состояния загрузки, пустоты, ошибки, прав, валидации и успеха сохраняются. Убрать Admiral DS и `@omni/react-omni-ui`.
- `50-validator-rule.mdc`: проверки сервера, веба и миграций. Кейсы API бьют в контроллер Nest и в строки PostgreSQL. Кейсы UI бьют в гидрацию и состояния страницы.
- `60-developer-rule.mdc`: реализация по тем же каталогам. React остаётся на `FC<Props>`. База только через репозиторий TypeORM внутри Nest.
- `70-integrator-rule.mdc`: сборка Nest и клиента React, переменные подключения к PostgreSQL, прогон миграций. Убрать Module Federation и `remoteEntry.js`.
- `62-no-re-exports.mdc`: примеры импортов заменить на пути `apps/web` и `apps/server`. Сгенерированные миграции и вывод Swagger не править руками.
- `66-colocated-unit-folder-and-readme-index.mdc`: примеры каталогов заменить на модуль Nest и страницу React. Смысл колокации тестов сохранить.
- `67-table-column-ordinals.mdc`: убрать `tableConfig.number`. Порядок колонок — порядок в описании колонок React.

Сохранить frontmatter `description` / `alwaysApply` / `globs`, кроме `67`: glob `**/tableConfig.ts` снять, правило сделать `alwaysApply: false` без привязки к Omni-файлу, с glob `**/*.{ts,tsx}` только если текст правила относится к таблицам React. Если правило больше не нужно на каждом файле, оставить `alwaysApply: false` и glob `**/*Column*.tsx`.

Писать правила по-английски, в том же тоне, что текущие файлы.

## Do not

- Не редактировать `README.md`, `01-theory.md`, `02-maturity.md`, `03-transitions.md`, `04-roles.md`, `05-docs-repo.md`.
- Не редактировать `61-react-component-signature.mdc` и `63-event-handler-pass-through.mdc`.
- Не создавать приложение, `package.json`, исходники `apps/`.
- Не добавлять Prisma, Drizzle, MongoDB, GraphQL, Orval, Effector, Admiral.

## Done when

- В перечисленных десяти файлах нет строк `Orval`, `Admiral`, `react-query`, `pmts`, `Craco`, `Effector`, `DictionarySystems`, `axios`, `Module Federation`, `sns-condition`, `SystemsDictionary`, `tableConfig`.
- `00`, `30`, `60` и `70` называют React, Nest SSR и PostgreSQL.
- `00` прямо говорит, что родительский стек ERMO/Omni для этого репозитория не применяется.
