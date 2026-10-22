import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownView } from './MarkdownView';

const render = (content: string): string =>
  renderToStaticMarkup(
    createElement(MarkdownView, {
      documentPath: 'docs/payments/main/order-list/in-progress/analyst.md',
      content,
      appliedUpdates: [],
      openUpdates: [],
      canCreateUpdate: false,
      addChangeDisabled: false,
      onOpenFile: () => undefined,
      onAddSectionChange: () => undefined,
    }),
  );

test('картинка в ссылке на Pixo открывает макет', () => {
  const html = render(
    [
      '## Задачи',
      '',
      '| Номер | Скриншот |',
      '|---|---|',
      '| 1 | [![Список заказов](../assets/screen.png)](https://pixo.example/order-list) |',
      '',
    ].join('\n'),
  );
  assert.match(html, /class="doc-pixo"/);
  assert.match(html, /href="https:\/\/pixo\.example\/order-list"/);
  assert.match(html, /target="_blank"/);
  assert.match(
    html,
    /src="\/api\/raw\?path=docs%2Fpayments%2Fmain%2Forder-list%2Fassets%2Fscreen\.png"/,
  );
  assert.match(html, /alt="Список заказов"/);
});

test('текстовая ссылка Pixo остаётся текстом', () => {
  const html = render('## Задачи\n\n[Pixo](https://pixo.example/invoices)\n');
  assert.doesNotMatch(html, /doc-pixo/);
  assert.match(html, /href="https:\/\/pixo\.example\/invoices"/);
  assert.match(html, />Pixo</);
});

test('картинка без ссылки не становится ссылкой', () => {
  const html = render('## Задачи\n\n![](../assets/screen.png)\n');
  assert.doesNotMatch(html, /doc-pixo/);
  assert.match(html, /<img /);
});
