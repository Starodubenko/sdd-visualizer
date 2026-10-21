# 02 — Документы метода

role: developer
next: done

## Read

- `.cursor/plans/react-nest-ssr-postgres/SPEC.md`
- `.cursor/plans/react-nest-ssr-postgres/state.md`
- `README.md`
- `01-theory.md`
- `02-maturity.md`
- `03-transitions.md`
- `04-roles.md`
- `05-docs-repo.md`

## Do

Привести метод к стеку из SPEC, не меняя уровни, роли и имена файлов фичи.

- `README.md`: приложение — React + Nest SSR + PostgreSQL, а не админка OpsNext и не `pmts-omni12-core-ui`. Слои из SPEC. Orval не упоминать.
- `01-theory.md`: срез архитектуры заменить на страницу React, Nest-модуль, SSR и сущность TypeORM в PostgreSQL. Таблицу исполняемых частей перевести с OpenAPI-клиента на контроллер Nest, миграцию и команду SSR-сборки.
- `02-maturity.md` и `03-transitions.md`: заменить «словарь / ручной клиент / хук / OpenAPI-клиент» на страницу React, Nest-модуль, миграцию PostgreSQL и SSR. Идентификаторы уровней и число критериев сохранить.
- `04-roles.md`: backend передаёт операцию Nest, сущность и миграцию. Frontend собирает страницу React, которую рендерит Nest SSR. Остальной флоу ролей не пересказывать заново и не сокращать уровни.
- `05-docs-repo.md`: в шаблоне `backend.md` добавить таблицу PostgreSQL, сущность TypeORM и миграцию; источник контракта — модуль Nest и DTO, Swagger выпускается из них. В шаблоне `frontend.md` слои заменить на page, feature, server module, ssr. Критерии BE-* и FE-* обновить так, чтобы они проверяли эти поля, и сохранить их номера BE-1…BE-8 и FE-1…FE-10. Упоминание репозитория `pmts-omni12-core-ui` заменить на репозиторий приложения со структурой из SPEC.

Документы остаются на русском. Диаграммы mermaid сохраняются; подписи в них поправить, если они называют старый стек.

## Do not

- Не редактировать `.cursor/rules/`.
- Не создавать приложение и не менять состав файлов фичи.
- Не удалять разделы уровней 0–4.

## Done when

- В шести документах нет `pmts-omni`, `Orval`, `Admiral`, `react-query`, `словарь` как эталона слоя.
- README, теория и `05-docs-repo.md` называют React, Nest SSR и PostgreSQL.
- Номера критериев AN, DS, BE, QA, FE те же, что до правки.
