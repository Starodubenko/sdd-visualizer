import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fragmentFromHref, fragmentLink } from './text-fragment';

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
