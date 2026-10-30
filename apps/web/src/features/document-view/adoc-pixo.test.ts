import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AsciiDocView } from './AsciiDocView';
import { splitAdocSections } from './adoc-sections';
import { warmAdoc } from './adoc-html';

const render = async (content: string): Promise<string> => {
  const { prelude, sections } = splitAdocSections(content);
  await warmAdoc(prelude);
  await Promise.all(sections.map((section) => warmAdoc(section.body)));
  return renderToStaticMarkup(
    createElement(AsciiDocView, {
      documentPath: 'docs/payments/main/order-list/in-progress/analyst.adoc',
      content,
      appliedUpdates: [],
      openUpdates: [],
      canCreateUpdate: false,
      addChangeDisabled: false,
      onOpenFile: () => undefined,
      onAddSectionChange: () => undefined,
      editable: false,
      onSaveContent: () => Promise.resolve(),
    }),
  );
};

test('картинка в ссылке на Pixo открывает макет', async () => {
  const html = await render(
    [
      '== Задачи',
      '',
      '|===',
      '| Номер | Скриншот',
      '',
      '| 1 | image:../assets/screen.png[Список заказов,link=https://pixo.example/order-list]',
      '|===',
      '',
    ].join('\n'),
  );
  assert.match(html, /class="[^"]*doc-pixo/);
  assert.match(html, /href="https:\/\/pixo\.example\/order-list"/);
  assert.match(html, /target="_blank"/);
  assert.match(
    html,
    /src="\/api\/raw\?path=docs%2Fpayments%2Fmain%2Forder-list%2Fassets%2Fscreen\.png"/,
  );
  assert.match(html, /alt="Список заказов"/);
});

test('текстовая ссылка Pixo остаётся текстом', async () => {
  const html = await render('== Задачи\n\nhttps://pixo.example/invoices[Pixo]\n');
  assert.doesNotMatch(html, /doc-pixo/);
  assert.match(html, /href="https:\/\/pixo\.example\/invoices"/);
  assert.match(html, />Pixo</);
});

test('ссылка xref ведёт в файл и в блок с тем же названием', async () => {
  const html = await render(
    ['== Компонент', '', 'Колонки: xref:../analyst.adoc#таблица[Таблица]'].join('\n'),
  );
  assert.match(html, /data-path="\.\.\/analyst\.adoc"/);
  assert.match(html, /data-highlight="Таблица"/);
  assert.match(html, /data-anchor="таблица"/);
  assert.doesNotMatch(html, /analyst\.html/);
});

test('метод и путь рисуются строкой ручки, путь можно скопировать', async () => {
  const html = await render(
    [
      '== Операция',
      '',
      '* метод: GET',
      '* путь: /pmts-complaint/api/v1/department/get-all',
      '* поля: код отдела',
      '',
      'POST /pmts-complaint/api/v1/department/create',
      '',
      'Клиент вызывает GET /pmts-complaint/api/v1/department/get-all без тела.',
    ].join('\n'),
  );
  assert.match(html, /class="api-op-method api-op-get"/);
  assert.match(html, /data-copy="\/pmts-complaint\/api\/v1\/department\/get-all"/);
  assert.match(html, /class="api-op-method api-op-post"/);
  assert.match(html, /data-copy="\/pmts-complaint\/api\/v1\/department\/create"/);
  assert.match(html, /код отдела/);
  assert.match(html, /Клиент вызывает GET \/pmts-complaint\/api\/v1\/department\/get-all без тела\./);
});

test('json-блок раскрашивает ключ, строку, число и литерал', async () => {
  const html = await render(
    [
      '== Пример ответа',
      '',
      '[source,json]',
      '----',
      '{',
      '  "departmentName": "Претензии",',
      '  "active": true,',
      '  "id": "id-1"',
      '}',
      '----',
    ].join('\n'),
  );
  assert.match(html, /class="json-key">"departmentName"</);
  assert.match(html, /class="json-string">"Претензии"</);
  assert.match(html, /class="json-literal">true</);
  assert.match(html, /class="json-string">"id-1"</);
});

test('ссылка note рисует метку блока', async () => {
  const html = await render(
    [
      '== Валидация',
      '',
      '|===',
      '| Поле | Правило',
      '',
      '| Наименование note:../assets/create-empty.png[3] | максимум 25 символов',
      '|===',
    ].join('\n'),
  );
  assert.match(html, /class="asset-note-ref"/);
  assert.match(html, /data-image="\.\.\/assets\/create-empty\.png"/);
  assert.match(html, /data-note="3"/);
});

test('картинка без ссылки не становится ссылкой', async () => {
  const html = await render('== Задачи\n\nimage:../assets/screen.png[]\n');
  assert.doesNotMatch(html, /doc-pixo/);
  assert.match(html, /<img /);
});
