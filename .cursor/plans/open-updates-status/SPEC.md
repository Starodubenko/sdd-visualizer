# Статус фичи при незакрытом изменении

Файл в `updates/in-progress` — нереализованное изменение. Пока такой файл есть, статус фичи — `changes`, подпись «Требуется изменение». Этот статус выше «В процессе», «Готово к реализации» и «Выполнено».

Файлы фичи не переносятся. Их теги по-прежнему берутся из `in-progress`, `ready-to-implement` и `done`. Каталог `updates/done` на статус фичи не влияет. `assets` не входит в статус.

Шапка коллапсера секции, на которую ссылается незакрытый файл (`source` и `section`), красится фоном `--bad-soft`. Дата последнего применённого изменения и кнопка «Добавить изменение» остаются.

```mermaid
stateDiagram-v2
  [*] --> changes: есть файл в updates/in-progress
  [*] --> in_progress: незакрытых изменений нет и есть файл в работе или нет ключевого
  [*] --> ready: незакрытых нет, в работе никого нет, есть файл готовый к реализации
  [*] --> done: незакрытых нет и каждый файл в done
```

```mermaid
sequenceDiagram
  participant Tree as Дерево фичи
  participant Spec as Секция спеки
  participant Draft as updates/in-progress
  participant Done as updates/done

  Draft->>Tree: статус changes
  Draft->>Spec: шапка секции source/section
  Note over Draft,Done: «Выполнено» переносит файл
  Done->>Tree: статус снова по файлам фичи
  Done->>Spec: шапка без подсветки
```
