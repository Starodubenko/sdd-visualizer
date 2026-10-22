import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitAdocSections } from './adoc-sections';

const analystTemplate = (featureId: string): string => `= ${featureId}

feature: ${featureId}
role: analyst

== Контекст


== Результат


== Критерии приёмки
* AC-1. 

== Вне задачи
* 

== Контракт
* метод: 
* путь: 
* поля: 

== Задачи
|===
| Номер | Скриншот и ссылка на Pixo | Описание

| | | 
|===

== Критерии приёмки артефакта
|===
| ID | Критерий

| AN-1 | Директория названа feature-id и покрывает один наблюдаемый результат.
|===
`;

test('шаблон аналитика делится на секции без дубля заголовков в шапке', () => {
  const { prelude, sections } = splitAdocSections(analystTemplate('order-list'));
  assert.match(prelude, /order-list/);
  assert.match(prelude, /feature: order-list/);
  assert.doesNotMatch(prelude, /^== Контекст/m);
  assert.deepEqual(
    sections.map((section) => section.title),
    [
      'Контекст',
      'Результат',
      'Критерии приёмки',
      'Вне задачи',
      'Контракт',
      'Задачи',
      'Критерии приёмки артефакта',
    ],
  );
  for (const section of sections) {
    assert.doesNotMatch(section.body, /^== [^=]/m);
  }
});

test('строка == внутри листинга не начинает раздел', () => {
  const content = [
    '= Документ',
    '',
    '== Контекст',
    '',
    '[source]',
    '----',
    '== не раздел',
    '----',
    '',
    '== Результат',
    '',
    'текст',
  ].join('\n');
  const { sections } = splitAdocSections(content);
  assert.deepEqual(
    sections.map((section) => section.title),
    ['Контекст', 'Результат'],
  );
  assert.match(sections[0]?.body ?? '', /== не раздел/);
});
