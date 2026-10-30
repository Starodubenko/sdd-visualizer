import assert from 'node:assert/strict';
import { test } from 'node:test';
import { highlightForAnchor, splitAdocSections, splitNestedCollapsers } from './adoc-sections';

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

test('вложенные коллапсеры валидации отделяются от таблиц и листинга', () => {
  const body = [
    '[[валидации]]',
    '=== Комментарий дела',
    '',
    '|===',
    '| Поле | Правило | Текст',
    '',
    '| комментарий | не пустой | Комментарий не должен быть пустым',
    '|===',
    '',
    '=== Статус дела',
    '',
    '[source]',
    '----',
    '=== не коллапсер',
    '----',
    '',
    'текст',
  ].join('\n');
  const nested = splitNestedCollapsers(body);
  assert.match(nested.prelude, /\[\[валидации\]\]/);
  assert.deepEqual(
    nested.sections.map((section) => section.title),
    ['Комментарий дела', 'Статус дела'],
  );
  assert.match(nested.sections[1]?.body ?? '', /=== не коллапсер/);
});

test('якорь у заголовка открывает этот блок, якорь внутри — абзац под ним', () => {
  const content = [
    '== Дроверы',
    '',
    '[[дроверы]]',
    'Панель детализации.',
    '',
    '[[document]]',
    'Рублёвый документ показывает реквизиты платёжной инструкции.',
  ].join('\n');
  assert.equal(highlightForAnchor(content, 'дроверы'), 'Дроверы');
  assert.equal(
    highlightForAnchor(content, 'document'),
    'Рублёвый документ показывает реквизиты платёжной инструкции.',
  );
  assert.equal(highlightForAnchor(content, 'нет'), null);
});

test('образец [source,asciidoc] на ------ не отдаёт внутренние == в заголовки', () => {
  const content = [
    '= Репозиторий',
    '',
    '== Аналитик',
    '',
    '[source,asciidoc]',
    '------',
    '= Шаблон',
    '',
    '== Контекст',
    'текст',
    '',
    '[source,mermaid]',
    '----',
    'sequenceDiagram',
    '----',
    '',
    '------',
    '',
    'проза после образца',
  ].join('\n');
  const { sections } = splitAdocSections(content);
  assert.deepEqual(sections.map((section) => section.title), ['Аналитик']);
  assert.doesNotMatch(
    sections.map((section) => section.title).join('\n'),
    /Контекст|Задачи|Операция|Слои/,
  );
});
