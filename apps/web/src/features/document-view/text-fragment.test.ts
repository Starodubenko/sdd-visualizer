import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fragmentBrowserHref,
  fragmentFromHref,
  fragmentLink,
  isNavigationHighlightHash,
  textFromFragmentHash,
} from './text-fragment';

test('fragmentLink кодирует текст во фрагмент ссылки', () => {
  const link = fragmentLink('analyst.md', 'виден список');
  assert.match(link, /analyst\.md#t=/);
  assert.match(link, /%D0%B2%D0%B8%D0%B4%D0%B5%D0%BD%20%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA/);
  assert.equal(fragmentFromHref(link.slice(link.indexOf('(') + 1, link.length - 1))?.text, 'виден список');
});

test('fragmentLink схлопывает переводы строк в t', () => {
  const link = fragmentLink('analyst.md', 'виден\n\nсписок');
  const href = link.slice(link.indexOf('(') + 1, link.length - 1);
  assert.equal(fragmentFromHref(href)?.text, 'виден список');
});

test('fragmentFromHref без #t= возвращает null', () => {
  assert.equal(fragmentFromHref('analyst.md'), null);
  assert.equal(fragmentFromHref('analyst.md#section'), null);
});

test('isNavigationHighlightHash узнает переход по фрагменту и по блоку заметки', () => {
  assert.equal(isNavigationHighlightHash('#t=%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA'), true);
  assert.equal(isNavigationHighlightHash('#asset-note-docs-ermo-analyst-png-2-block'), true);
  assert.equal(isNavigationHighlightHash('#смысл'), false);
  assert.equal(isNavigationHighlightHash(''), false);
});

test('fragmentBrowserHref ставит текст в адрес страницы', () => {
  const href = fragmentBrowserHref(
    'http://localhost:3000/?project=ermo&path=docs%2Fermo%2Fanalyst.adoc',
    'виден\n\nсписок',
  );
  assert.match(href, /^http:\/\/localhost:3000\/\?project=ermo&path=docs%2Fermo%2Fanalyst\.adoc#t=/);
  assert.equal(textFromFragmentHash(new URL(href).hash), 'виден список');
});
