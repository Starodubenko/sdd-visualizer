# Маршрут теории

Теория метода лежит в `docs/method` и не является проектом: селектор проектов её не показывает. Отдельный маршрут `/method` открывает это дерево в том же каркасе, что фичи и настройки. В бургере шапки на неё есть ссылка.

`method` по-прежнему не проект. Создание эпиков, фич и агентов на этом экране нет. Файлы читаются и правятся существующим просмотром документа.

```mermaid
classDiagram
  class SsrController {
    GET /
    GET /settings
    GET /method
  }
  class SsrService {
    workspaceData()
    settingsData()
    methodData()
  }
  class WorkspacePage {
    mode workspace
    mode settings
    mode method
  }
  SsrController --> SsrService
  SsrService --> WorkspacePage
```

```mermaid
sequenceDiagram
  actor User as Оператор
  participant Menu as Бургер шапки
  participant Page as /method
  participant Docs as docs/method

  User->>Menu: Теория
  Menu->>Page: переход по ссылке
  Page->>Docs: список каталога
  Docs-->>Page: файлы теории
  Page-->>User: дерево и открытый документ
```
