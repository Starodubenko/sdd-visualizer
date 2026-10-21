import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { DocumentsService } from './documents.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { copyFixtures } from '../test-support/copy-fixtures';

test('статусы фич читаются по каталогам', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const invoices = await documents.describe('docs/billing/invoices');
  const orderList = await documents.describe('docs/payments/order-list');
  const paymentCard = await documents.describe('docs/payments/payment-card');
  assert.equal(invoices.status, 'changes');
  assert.equal(orderList.status, 'in_progress');
  assert.equal(paymentCard.status, 'in_progress');
});

test('перенос файла из готово снимает готовность фичи', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await rm(join(root, 'docs/billing/invoices/updates/in-progress'), {
    recursive: true,
    force: true,
  });
  await documents.moveStatus(
    'docs/billing/invoices/ready-to-implement/frontend.md',
    'in_progress',
  );
  const invoices = await documents.describe('docs/billing/invoices');
  assert.equal(invoices.status, 'in_progress');
  const moved = await readFile(
    join(root, 'docs/billing/invoices/in-progress/frontend.md'),
    'utf8',
  );
  assert.match(moved, /invoices/);
});

test('дерево не возвращает текст большого файла', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/order-list/in-progress');
  const payload = JSON.stringify(entries);
  assert.match(payload, /large\.md/);
  assert.doesNotMatch(payload, /UNIQUE_LARGE_BODY_SENTINEL/);
});

test('список фичи скрывает каталоги статуса', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/order-list');
  const payload = JSON.stringify(entries);
  assert.ok(entries.some((entry) => entry.name === 'large.md'));
  assert.deepEqual(
    entries.find((entry) => entry.name === 'обзор.md'),
    {
      name: 'обзор.md',
      kind: 'file',
      status: 'done',
      path: 'docs/payments/order-list/done/обзор.md',
    },
  );
  assert.ok(
    !entries.some((entry) => entry.name === 'in-progress' && entry.kind === 'dir'),
  );
  assert.ok(
    !entries.some(
      (entry) => entry.name === 'ready-to-implement' && entry.kind === 'dir',
    ),
  );
  assert.ok(!entries.some((entry) => entry.name === 'done' && entry.kind === 'dir'));
  assert.doesNotMatch(payload, /UNIQUE_LARGE_BODY_SENTINEL/);
});

test('перенос ключевых файлов в done меняет статус фичи', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const withOpenUpdate = await documents.describe('docs/billing/invoices');
  assert.equal(withOpenUpdate.status, 'changes');
  await documents.moveStatus(
    'docs/billing/invoices/ready-to-implement/analyst.md',
    'done',
  );
  const partial = await documents.describe('docs/billing/invoices');
  assert.equal(partial.status, 'changes');
  for (const name of ['designer.md', 'backend.md', 'tester.yaml', 'frontend.md']) {
    await documents.moveStatus(
      `docs/billing/invoices/ready-to-implement/${name}`,
      'done',
    );
  }
  const keysDoneOpenUpdate = await documents.describe('docs/billing/invoices');
  assert.equal(keysDoneOpenUpdate.status, 'changes');
  await rm(
    join(
      root,
      'docs/billing/invoices/updates/in-progress/2026-10-21-0309-analyst-результат.md',
    ),
  );
  await documents.moveStatus(
    'docs/billing/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md',
    'done',
  );
  await documents.moveStatus(
    'docs/billing/invoices/updates/in-progress/2026-10-21-0427-backend-пример-ответа.md',
    'done',
  );
  const complete = await documents.describe('docs/billing/invoices');
  assert.equal(complete.status, 'done');
});

test('создание фичи пишет пять шаблонов в каталог в процессе', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'new-card');
  const analyst = await readFile(
    join(root, 'docs/payments/new-card/in-progress/analyst.md'),
    'utf8',
  );
  assert.match(analyst, /\| Номер \| Скриншот и ссылка на Pixo \| Описание \|/);
  assert.match(analyst, /AN-1/);
  assert.match(analyst, /AN-8/);
  for (const name of ['designer.md', 'backend.md', 'tester.yaml', 'frontend.md']) {
    const content = await readFile(
      join(root, 'docs/payments/new-card/in-progress', name),
      'utf8',
    );
    assert.ok(content.includes('new-card'));
  }
});

test('каталог global скрыт от дерева', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(() => documents.list('global'), NotFoundException);
});

test('список проекта проставляет статус каталогам фич', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const billing = await documents.list('docs/billing');
  const payments = await documents.list('docs/payments');
  assert.deepEqual(
    billing.find((entry) => entry.name === 'invoices'),
    { name: 'invoices', kind: 'dir', status: 'changes' },
  );
  assert.deepEqual(
    payments.find((entry) => entry.name === 'order-list'),
    { name: 'order-list', kind: 'dir', status: 'in_progress' },
  );
});

test('createUpdate пишет файл изменения и не трогает спеку', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const specPath = 'docs/billing/invoices/ready-to-implement/analyst.md';
  const patchBody = 'Краткий текст правки для теста.';
  const at = new Date('2026-10-21T14:05:00');
  const wouldBeUpdatePath =
    'docs/billing/invoices/updates/in-progress/2026-10-21-1405-analyst-результат.md';
  await assert.rejects(
    () => documents.createUpdate(specPath, 'Результат', patchBody, at),
    BadRequestException,
  );
  await assert.rejects(() => stat(join(root, wouldBeUpdatePath)));
  const moved = await documents.moveStatus(specPath, 'done');
  const doneSpecPath = moved.path;
  const before = await readFile(join(root, doneSpecPath), 'utf8');
  const created = await documents.createUpdate(doneSpecPath, 'Результат', patchBody, at);
  assert.equal(created.path, wouldBeUpdatePath);
  const updateContent = await readFile(join(root, created.path), 'utf8');
  assert.match(updateContent, /^source: analyst\.md$/m);
  assert.match(updateContent, /^section: Результат$/m);
  assert.match(updateContent, /## Оригинал\n\nКраткий текст правки для теста\./);
  assert.match(updateContent, /## Правка\n\nКраткий текст правки для теста\./);
  const after = await readFile(join(root, doneSpecPath), 'utf8');
  assert.equal(after, before);
});

test('moveStatus для файла изменения дописывает секцию и переносит в updates/done', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const updatePath =
    'docs/billing/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md';
  const moved = await documents.moveStatus(updatePath, 'done');
  assert.equal(
    moved.path,
    'docs/billing/invoices/updates/done/2026-10-21-0423-backend-пример-запроса.md',
  );
  const backend = await readFile(
    join(root, 'docs/billing/invoices/ready-to-implement/backend.md'),
    'utf8',
  );
  assert.match(backend, /```json\n\{\}\n```/);
  await assert.rejects(() => stat(join(root, updatePath)));
  await stat(join(root, moved.path));
});

test('moveStatus для файла изменения отклоняет расхождение с оригиналом', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const updatePath =
    'docs/billing/invoices/updates/in-progress/2026-10-21-0309-analyst-результат.md';
  const analystPath = join(root, 'docs/billing/invoices/ready-to-implement/analyst.md');
  const analystBefore = await readFile(analystPath, 'utf8');
  await assert.rejects(
    () => documents.moveStatus(updatePath, 'done'),
    BadRequestException,
  );
  assert.equal(await readFile(analystPath, 'utf8'), analystBefore);
  await stat(join(root, updatePath));
});

test('список фичи проставляет hasOpenChange по source из updates/in-progress', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/billing/invoices');
  assert.deepEqual(entries.find((entry) => entry.name === 'analyst.md'), {
    name: 'analyst.md',
    kind: 'file',
    status: 'ready',
    path: 'docs/billing/invoices/ready-to-implement/analyst.md',
    hasOpenChange: true,
  });
  const backend = entries.find((entry) => entry.name === 'backend.md');
  assert.ok(backend);
  assert.equal(backend.hasOpenChange, true);
  await documents.moveStatus(
    'docs/billing/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md',
    'done',
  );
  await documents.moveStatus(
    'docs/billing/invoices/updates/in-progress/2026-10-21-0427-backend-пример-ответа.md',
    'done',
  );
  const afterMove = await documents.list('docs/billing/invoices');
  const analystAfter = afterMove.find((entry) => entry.name === 'analyst.md');
  const backendAfter = afterMove.find((entry) => entry.name === 'backend.md');
  assert.ok(analystAfter);
  assert.equal(analystAfter.status, 'ready');
  assert.equal(analystAfter.hasOpenChange, true);
  assert.ok(backendAfter);
  assert.equal(backendAfter.hasOpenChange, undefined);
});

test('renameFeature переименовывает каталог и строку feature в файлах', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.renameFeature('docs/payments/payment-card', 'card-pay');
  assert.equal(result.path, 'docs/payments/card-pay');
  await assert.rejects(() => stat(join(root, 'docs/payments/payment-card')));
  const described = await documents.describe('docs/payments/card-pay');
  assert.equal(described.kind, 'feature');
  const analyst = await readFile(
    join(root, 'docs/payments/card-pay/in-progress/analyst.md'),
    'utf8',
  );
  assert.match(analyst, /^# Карточка платежа/m);
  assert.match(analyst, /^feature: card-pay$/m);
  assert.doesNotMatch(analyst, /^feature: payment-card$/m);
});

test('renameFeature отклоняет некорректное имя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.renameFeature('docs/payments/payment-card', 'Bad Name'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'Имя фичи — kebab-case',
  );
  await stat(join(root, 'docs/payments/payment-card'));
});

test('renameFeature отклоняет конфликт с существующей фичей', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.renameFeature('docs/payments/payment-card', 'order-list'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Фича уже существует',
  );
  await stat(join(root, 'docs/payments/payment-card'));
});

test('renameFeature на то же имя не трогает каталог', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.renameFeature('docs/payments/payment-card', 'payment-card');
  assert.equal(result.path, 'docs/payments/payment-card');
  await stat(join(root, 'docs/payments/payment-card'));
});

test('внутри фичи вложенные каталоги без статуса не получают точку в list', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/order-list');
  const assets = entries.find((entry) => entry.name === 'assets' && entry.kind === 'dir');
  assert.ok(assets);
  assert.equal(assets.status, undefined);
});
