# Реестр счетов

feature: invoices
role: frontend

## Слои

- page: `apps/web/src/pages/InvoiceList/`
- feature: `apps/web/src/features/mark-invoice-sent/`
- server module: `apps/server/src/invoices/`
- ssr: `apps/server/src/ssr/invoices`

## Поля экрана

| Поле из backend.md | Где читается в интерфейсе |
|--------------------|---------------------------|
| number | колонка «Номер» |
| amount | колонка «Сумма» |
| sent | колонка «Отметка»: «Черновик» или «Отправлен» |

## Дельта

- кнопка «Отметить отправленным» рисуется только при `sent = false`
- после успешного POST отметка в строке становится «Отправлен» без перезагрузки страницы

## Тексты

Тексты взяты из designer.md: «Черновик», «Отправлен», «Отметить отправленным», «Счетов нет».
