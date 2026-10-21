import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureStatus } from './feature-status';

const allKeyDone = [
  'analyst.md',
  'designer.md',
  'backend.md',
  'tester.yaml',
  'frontend.md',
];

test('лишний файл в in-progress при всех ключевых в done — in_progress', () => {
  const { status } = featureStatus(['large.md'], [], allKeyDone);
  assert.equal(status, 'in_progress');
});

test('лишний файл в ready-to-implement при всех ключевых в done — ready', () => {
  const { status } = featureStatus([], ['обзор.md'], allKeyDone);
  assert.equal(status, 'ready');
});

test('все файлы в done — done', () => {
  const { status } = featureStatus([], [], [...allKeyDone, 'обзор.md']);
  assert.equal(status, 'done');
});

test('незакрытое изменение перекрывает done', () => {
  const { status } = featureStatus([], [], allKeyDone, true);
  assert.equal(status, 'changes');
});
