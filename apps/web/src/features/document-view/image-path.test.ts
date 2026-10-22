import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageRawHref, isImagePath } from './image-path';

test('любое расширение картинки открывается как изображение', () => {
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.png'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.JPEG'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.webp'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.svg'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.gif'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/assets/screen.avif'), true);
  assert.equal(isImagePath('docs/payments/main/order-list/in-progress/analyst.md'), false);
  assert.equal(isImagePath('docs/payments/main/order-list/in-progress/tester.yaml'), false);
});

test('адрес картинки указывает на сырой файл', () => {
  assert.equal(
    imageRawHref('docs/payments/main/order-list/assets/screen.png'),
    '/api/raw?path=docs%2Fpayments%2Fmain%2Forder-list%2Fassets%2Fscreen.png',
  );
});
