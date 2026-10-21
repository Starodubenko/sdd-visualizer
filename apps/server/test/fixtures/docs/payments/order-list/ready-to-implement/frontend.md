# Список заказов

feature: order-list
role: frontend
depends:
  - analyst.md
  - designer.md
  - backend.md
  - tester.yaml

## Слои

- page: `apps/web/src/pages/OrderList/`
- feature: `apps/web/src/features/order-list/`
- server module: `apps/server/src/orders/`
- ssr: `apps/server/src/ssr/order-list`

## Эталон

Каталоги страницы списка и Nest-модуля чтения.

## Вызов API

После гидрации страница вызывает `GET /orders?day=` через общий клиент. Ответ читается как `{ number, amount, status }`.

## Поля экрана

| Поле из backend.md | Где читается в интерфейсе |
|--------------------|---------------------------|
| number | первая колонка таблицы |
| amount | вторая колонка |
| status | третья колонка |

## Трассировка

| AC | Модуль |
|----|--------|
| AC-1 | `apps/web/src/pages/OrderList/` |
| AC-2 | `apps/web/src/features/order-list/` |
| AC-3 | `apps/web/src/features/order-list/` |

## Каркас

- страница списка по эталону OrderList
- без миграции: таблица orders уже есть

## Дельта

- подписи колонок и тексты пустого дня и ошибки берутся из designer.md

## Тексты

Тексты интерфейса взяты из designer.md без перефразирования.
