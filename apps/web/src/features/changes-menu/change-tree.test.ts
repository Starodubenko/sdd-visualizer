import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChangeTree } from './change-tree';

test('buildChangeTree группирует пути в дерево', () => {
  const tree = buildChangeTree([
    { path: 'invoices/a.md', status: 'modified' },
    { path: 'invoices/sub/b.md', status: 'added' },
  ]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.name, 'invoices');
  const invoicesChildren = tree[0]?.children ?? [];
  assert.equal(invoicesChildren.length, 2);
  const fileA = invoicesChildren.find((node) => node.name === 'a.md');
  assert.equal(fileA?.status, 'modified');
  assert.equal(fileA?.children, undefined);
  const sub = invoicesChildren.find((node) => node.name === 'sub');
  assert.equal(sub?.status, undefined);
  assert.equal(sub?.children?.length, 1);
  assert.equal(sub?.children?.[0]?.name, 'b.md');
  assert.equal(sub?.children?.[0]?.status, 'added');
});
