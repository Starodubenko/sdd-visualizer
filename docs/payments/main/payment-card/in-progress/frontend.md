# Карточка платежа

feature: payment-card
role: frontend

## Слои

- page: `apps/web/src/pages/PaymentCard/`
- feature: `apps/web/src/features/payment-card/`
- server module: `apps/server/src/payments/`
- ssr: `apps/server/src/ssr/payment-card`

## Поля экрана

| Поле из backend.md | Где читается в интерфейсе |
|--------------------|---------------------------|
| amount | строка «Сумма» |
| recipient | строка «Получатель» |
| status | бейдж статуса |
| rejectReason | абзац под бейджем «Отклонён» |

## Тексты

«Проведён», «Отклонён» и «Платёж не найден» взяты из designer.md.
