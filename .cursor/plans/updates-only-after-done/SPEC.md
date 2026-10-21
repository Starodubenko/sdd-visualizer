# Изменение только после «Выполнено»

Новый файл в `updates/in-progress` создаётся только для спеки из каталога `done`. Для файла в `in-progress` или `ready-to-implement` сервер отвечает 400, а кнопка «Добавить изменение» не показывается.

Уже созданное незакрытое изменение по-прежнему открывается кнопкой «Текущие изменения». Дата «Последние изменения» остаётся.

```mermaid
sequenceDiagram
  actor User as Пользователь
  participant Bar as Коллапсер
  participant Api as POST /api/updates

  User->>Bar: файл не в done
  Note over Bar: кнопки «Добавить изменение» нет
  User->>Api: путь не в done
  Api-->>User: 400
  User->>Bar: файл в done
  Bar->>Api: создать файл в updates/in-progress
```
