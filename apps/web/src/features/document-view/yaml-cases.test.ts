import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readCases } from './yaml-cases';

test('разбирает кейсы tester.yaml', () => {
  const cases = readCases(`
cases:
  - id: AC-1
    title: Список открывается
    surface: ui
`);
  assert.deepEqual(cases, [{ id: 'AC-1', title: 'Список открывается', surface: 'ui' }]);
});

test('пустой yaml не даёт кейсов', () => {
  assert.deepEqual(readCases('feature: order-list'), []);
});
