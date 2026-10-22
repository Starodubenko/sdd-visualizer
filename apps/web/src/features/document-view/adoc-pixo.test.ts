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

test('картинка без ссылки не становится ссылкой', async () => {
  const html = await render('== Задачи\n\nimage:../assets/screen.png[]\n');
  assert.doesNotMatch(html, /doc-pixo/);
  assert.match(html, /<img /);
});
