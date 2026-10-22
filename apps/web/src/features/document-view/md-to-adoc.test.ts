import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownToAdoc } from './md-to-adoc';

test('конвертер переводит заголовок, таблицу, схему и картинку Pixo', () => {
  const source = [
    '# Список',
    '',
    'feature: order-list',
    '',
    '## Задачи',
    '',
    '| Номер | Скриншот |',
    '|---|---|',
    '| 1 | [![Список заказов](../assets/screen.png)](https://pixo.example/order-list) |',
    '',
    '```mermaid',
    'sequenceDiagram',
    '  User->>System: шаг',
    '```',
    '',
    'См. `analyst.md`.',
  ].join('\n');
  const adoc = markdownToAdoc(source);
  assert.match(adoc, /^= Список$/m);
  assert.match(adoc, /^== Задачи$/m);
  assert.match(adoc, /image:\.\.\/assets\/screen\.png\[Список заказов,link=https:\/\/pixo\.example\/order-list\]/);
  assert.match(adoc, /\[source,mermaid\]/);
  assert.match(adoc, /`analyst\.adoc`/);
  assert.doesNotMatch(adoc, /```/);
});
