# sdd-visualizer

Визуализатор документации на React и Nest SSR. Спецификации лежат в `docs/<проект>/<фича>/`. Базы данных нет.

Метод — в [docs/method](./docs/method/README.md).

## Запуск на моках

```bash
npm install
npm run start:mock
```

Сервер копирует `apps/server/test/fixtures` в `data/mock` и открывает рабочее место на `http://localhost:3000`.
