import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lstat, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DocumentsService } from './documents.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { copyFixtures } from '../test-support/copy-fixtures';

test('статусы фич читаются по каталогам', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const invoices = await documents.describe('docs/billing/main/invoices');
  const orderList = await documents.describe('docs/payments/main/order-list');
  const paymentCard = await documents.describe('docs/payments/main/payment-card');
  assert.equal(invoices.status, 'changes');
  assert.equal(orderList.status, 'in_progress');
  assert.equal(paymentCard.status, 'in_progress');
});

test('перенос файла из готово снимает готовность фичи', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await rm(join(root, 'docs/billing/main/invoices/updates/in-progress'), {
    recursive: true,
    force: true,
  });
  await documents.moveStatus(
    'docs/billing/main/invoices/ready-to-implement/frontend.md',
    'in_progress',
  );
  const invoices = await documents.describe('docs/billing/main/invoices');
  assert.equal(invoices.status, 'in_progress');
  const moved = await readFile(
    join(root, 'docs/billing/main/invoices/in-progress/frontend.md'),
    'utf8',
  );
  assert.match(moved, /invoices/);
});

test('дерево не возвращает текст большого файла', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/main/order-list/in-progress');
  const payload = JSON.stringify(entries);
  assert.match(payload, /large\.md/);
  assert.doesNotMatch(payload, /UNIQUE_LARGE_BODY_SENTINEL/);
});

test('список фичи скрывает каталоги статуса', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/main/order-list');
  const payload = JSON.stringify(entries);
  assert.ok(entries.some((entry) => entry.name === 'large.md'));
  assert.deepEqual(
    entries.find((entry) => entry.name === 'обзор.md'),
    {
      name: 'обзор.md',
      kind: 'file',
      status: 'done',
      path: 'docs/payments/main/order-list/done/обзор.md',
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
  const withOpenUpdate = await documents.describe('docs/billing/main/invoices');
  assert.equal(withOpenUpdate.status, 'changes');
  await documents.moveStatus(
    'docs/billing/main/invoices/ready-to-implement/analyst.md',
    'done',
  );
  const partial = await documents.describe('docs/billing/main/invoices');
  assert.equal(partial.status, 'changes');
  for (const name of ['designer.md', 'backend.md', 'tester.yaml', 'frontend.md']) {
    await documents.moveStatus(
      `docs/billing/main/invoices/ready-to-implement/${name}`,
      'done',
    );
  }
  const keysDoneOpenUpdate = await documents.describe('docs/billing/main/invoices');
  assert.equal(keysDoneOpenUpdate.status, 'changes');
  await rm(
    join(
      root,
      'docs/billing/main/invoices/updates/in-progress/2026-10-21-0309-analyst-результат.md',
    ),
  );
  await documents.moveStatus(
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md',
    'done',
  );
  await documents.moveStatus(
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0427-backend-пример-ответа.md',
    'done',
  );
  const complete = await documents.describe('docs/billing/main/invoices');
  assert.equal(complete.status, 'done');
});

test('создание фичи пишет пять шаблонов в каталог в процессе', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'main', 'new-card');
  const analyst = await readFile(
    join(root, 'docs/payments/main/new-card/in-progress/analyst.md'),
    'utf8',
  );
  assert.match(analyst, /\| Номер \| Скриншот и ссылка на Pixo \| Описание \|/);
  assert.match(analyst, /AN-1/);
  assert.match(analyst, /AN-8/);
  for (const name of ['designer.md', 'backend.md', 'tester.yaml', 'frontend.md']) {
    const content = await readFile(
      join(root, 'docs/payments/main/new-card/in-progress', name),
      'utf8',
    );
    assert.ok(content.includes('new-card'));
  }
});

test('настройки проекта — каталог и не видны в списке проекта', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const settings = await documents.describe('docs/payments/settings');
  assert.equal(settings.kind, 'directory');
  const project = await documents.list('docs/payments');
  assert.equal(
    project.some((entry) => entry.name === 'settings'),
    false,
  );
});

test('создание фичи учитывает лишний каталог настроек с template.*', async () => {
  const root = copyFixtures();
  const extraDir = join(root, 'docs/payments/settings/extra-type');
  await mkdir(extraDir, { recursive: true });
  await writeFile(
    join(extraDir, 'template.md'),
    '# {{feature}}\nfeature: {{feature}}\n',
    'utf8',
  );
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'main', 'with-extra');
  await stat(join(root, 'docs/payments/main/with-extra/in-progress/extra-type.md'));
  const extra = await readFile(
    join(root, 'docs/payments/main/with-extra/in-progress/extra-type.md'),
    'utf8',
  );
  assert.match(extra, /with-extra/);
});

test('каталог настроек только с agent.md не попадает в фичу', async () => {
  const root = copyFixtures();
  const agentOnlyDir = join(root, 'docs/payments/settings/agent-only');
  await mkdir(agentOnlyDir, { recursive: true });
  await writeFile(join(agentOnlyDir, 'agent.md'), 'agent\n', 'utf8');
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'main', 'no-agent-only');
  await assert.rejects(() =>
    stat(join(root, 'docs/payments/main/no-agent-only/in-progress/agent-only.md')),
  );
  for (const name of [
    'analyst.md',
    'designer.md',
    'backend.md',
    'tester.yaml',
    'frontend.md',
  ]) {
    await stat(join(root, 'docs/payments/main/no-agent-only/in-progress', name));
  }
});

test('создание фичи без шаблонов в настройках не создаёт каталог фичи', async () => {
  const root = copyFixtures();
  const settingsRoot = join(root, 'docs/payments/settings');
  for (const typeName of ['analyst', 'designer', 'backend', 'tester', 'frontend']) {
    const typeDir = join(settingsRoot, typeName);
    const entries = await readdir(typeDir);
    for (const fileName of entries) {
      if (fileName.startsWith('template.')) {
        await rm(join(typeDir, fileName));
      }
    }
  }
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.createFeature('payments', 'main', 'empty-settings'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'Нет шаблонов в настройках',
  );
  await assert.rejects(() => stat(join(root, 'docs/payments/main/empty-settings')));
});

test('каталог global скрыт от дерева', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(() => documents.list('global'), NotFoundException);
});

test('список эпика проставляет статус каталогам фич', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const billingProject = await documents.list('docs/billing');
  assert.equal(
    billingProject.some((entry) => entry.name === 'invoices'),
    false,
  );
  assert.deepEqual(
    billingProject.find((entry) => entry.name === 'main'),
    { name: 'main', kind: 'dir' },
  );
  const billing = await documents.list('docs/billing/main');
  const payments = await documents.list('docs/payments/main');
  assert.deepEqual(
    billing.find((entry) => entry.name === 'invoices'),
    { name: 'invoices', kind: 'dir', status: 'changes' },
  );
  assert.deepEqual(
    payments.find((entry) => entry.name === 'order-list'),
    { name: 'order-list', kind: 'dir', status: 'in_progress' },
  );
  const epic = await documents.describe('docs/billing/main');
  assert.equal(epic.kind, 'epic');
});

test('createUpdate пишет файл изменения и не трогает спеку', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const specPath = 'docs/billing/main/invoices/ready-to-implement/analyst.md';
  const patchBody = 'Краткий текст правки для теста.';
  const at = new Date('2026-10-21T14:05:00');
  const wouldBeUpdatePath =
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-1405-analyst-результат.md';
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
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md';
  const moved = await documents.moveStatus(updatePath, 'done');
  assert.equal(
    moved.path,
    'docs/billing/main/invoices/updates/done/2026-10-21-0423-backend-пример-запроса.md',
  );
  const backend = await readFile(
    join(root, 'docs/billing/main/invoices/ready-to-implement/backend.md'),
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
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0309-analyst-результат.md';
  const analystPath = join(root, 'docs/billing/main/invoices/ready-to-implement/analyst.md');
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
  const entries = await documents.list('docs/billing/main/invoices');
  assert.deepEqual(entries.find((entry) => entry.name === 'analyst.md'), {
    name: 'analyst.md',
    kind: 'file',
    status: 'ready',
    path: 'docs/billing/main/invoices/ready-to-implement/analyst.md',
    hasOpenChange: true,
  });
  const backend = entries.find((entry) => entry.name === 'backend.md');
  assert.ok(backend);
  assert.equal(backend.hasOpenChange, true);
  await documents.moveStatus(
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0423-backend-пример-запроса.md',
    'done',
  );
  await documents.moveStatus(
    'docs/billing/main/invoices/updates/in-progress/2026-10-21-0427-backend-пример-ответа.md',
    'done',
  );
  const afterMove = await documents.list('docs/billing/main/invoices');
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
  const result = await documents.renameFeature('docs/payments/main/payment-card', 'card-pay');
  assert.equal(result.path, 'docs/payments/main/card-pay');
  await assert.rejects(() => stat(join(root, 'docs/payments/main/payment-card')));
  const described = await documents.describe('docs/payments/main/card-pay');
  assert.equal(described.kind, 'feature');
  const analyst = await readFile(
    join(root, 'docs/payments/main/card-pay/in-progress/analyst.md'),
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
    () => documents.renameFeature('docs/payments/main/payment-card', 'Bad Name'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'Имя фичи — kebab-case',
  );
  await stat(join(root, 'docs/payments/main/payment-card'));
});

test('renameFeature отклоняет конфликт с существующей фичей', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.renameFeature('docs/payments/main/payment-card', 'order-list'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Фича уже существует',
  );
  await stat(join(root, 'docs/payments/main/payment-card'));
});

test('renameFeature на то же имя не трогает каталог', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.renameFeature('docs/payments/main/payment-card', 'payment-card');
  assert.equal(result.path, 'docs/payments/main/payment-card');
  await stat(join(root, 'docs/payments/main/payment-card'));
});

test('внутри фичи вложенные каталоги без статуса не получают точку в list', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const entries = await documents.list('docs/payments/main/order-list');
  const assets = entries.find((entry) => entry.name === 'assets' && entry.kind === 'dir');
  assert.ok(assets);
  assert.equal(assets.status, undefined);
});

test('createSettingsAgent создаёт каталог, файлы и строку оркестратора', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.createSettingsAgent('payments', 'review');
  assert.equal(result.path, 'docs/payments/settings/review');
  const template = await readFile(join(root, 'docs/payments/settings/review/template.md'), 'utf8');
  assert.equal(template, '# {{feature}}\nfeature: {{feature}}\nrole: review\n');
  const agent = await readFile(join(root, 'docs/payments/settings/review/agent.md'), 'utf8');
  assert.equal(
    agent,
    'Этот агент пишет только файл `review.md` по соседнему `template.md` и не меняет набор разделов.\n',
  );
  const orchestrator = await readFile(join(root, 'docs/payments/settings/orchestrator.md'), 'utf8');
  assert.match(orchestrator, /\| `review\.md` \| `settings\/review\/` \|/);
});

test('createSettingsAgent отклоняет повторное имя без изменения оркестратора', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createSettingsAgent('payments', 'review');
  const orchestratorBefore = await readFile(join(root, 'docs/payments/settings/orchestrator.md'), 'utf8');
  await assert.rejects(
    () => documents.createSettingsAgent('payments', 'review'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Агент уже существует',
  );
  const orchestratorAfter = await readFile(join(root, 'docs/payments/settings/orchestrator.md'), 'utf8');
  assert.equal(orchestratorAfter, orchestratorBefore);
});

test('createSettingsAgent отклоняет пустое имя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.createSettingsAgent('payments', ''),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Имя агента — kebab-case',
  );
  const settingsEntries = await readdir(join(root, 'docs/payments/settings'));
  assert.ok(!settingsEntries.includes(''));
});

test('deleteSettingsAgent удаляет каталог и строку оркестратора', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createSettingsAgent('payments', 'review');
  await documents.deleteSettingsAgent('payments', 'review');
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/review')));
  const orchestrator = await readFile(join(root, 'docs/payments/settings/orchestrator.md'), 'utf8');
  assert.doesNotMatch(orchestrator, /settings\/review\//);
  assert.match(orchestrator, /\| `analyst\.md` \| `settings\/analyst\/` \|/);
});

test('createSettingsSubagent создаёт каталог, файлы и строку в agent.md родителя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const analystAgentBefore = await readFile(
    join(root, 'docs/payments/settings/analyst/agent.md'),
    'utf8',
  );
  const result = await documents.createSettingsSubagent('payments', 'analyst', 'context');
  assert.equal(result.path, 'docs/payments/settings/analyst/context');
  const template = await readFile(
    join(root, 'docs/payments/settings/analyst/context/template.md'),
    'utf8',
  );
  assert.equal(template, '## context\n\nЧасть документа агента analyst.\n');
  const subagentAgent = await readFile(
    join(root, 'docs/payments/settings/analyst/context/agent.md'),
    'utf8',
  );
  assert.equal(
    subagentAgent,
    'Этот сабагент пишет только свою часть файла `analyst.md` по соседнему `template.md`.\n',
  );
  const analystAgentAfter = await readFile(
    join(root, 'docs/payments/settings/analyst/agent.md'),
    'utf8',
  );
  assert.ok(analystAgentAfter.startsWith(analystAgentBefore.trimEnd()));
  assert.match(
    analystAgentAfter,
    /\| `context` \| `settings\/analyst\/context\/` \|/,
  );
  assert.match(analystAgentAfter, /## Сабагенты/);
});

test('createSettingsSubagent не мешает созданию фичи без context.md', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createSettingsSubagent('payments', 'analyst', 'context');
  await documents.createFeature('payments', 'main', 'with-subagent');
  await stat(join(root, 'docs/payments/main/with-subagent/in-progress/analyst.md'));
  await assert.rejects(() =>
    stat(join(root, 'docs/payments/main/with-subagent/in-progress/context.md')),
  );
});

test('deleteSettingsSubagent удаляет каталог и раздел Сабагенты', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const analystAgentBefore = await readFile(
    join(root, 'docs/payments/settings/analyst/agent.md'),
    'utf8',
  );
  await documents.createSettingsSubagent('payments', 'analyst', 'context');
  await documents.deleteSettingsSubagent('payments', 'analyst', 'context');
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/analyst/context')));
  const analystAgentAfter = await readFile(
    join(root, 'docs/payments/settings/analyst/agent.md'),
    'utf8',
  );
  assert.equal(analystAgentAfter.trimEnd(), analystAgentBefore.trimEnd());
  assert.doesNotMatch(analystAgentAfter, /`context`/);
});

test('createSettingsSubagent отклоняет повторное имя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createSettingsSubagent('payments', 'analyst', 'context');
  await assert.rejects(
    () => documents.createSettingsSubagent('payments', 'analyst', 'context'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Сабагент уже существует',
  );
});

test('createSettingsSubagent отклоняет отсутствующего родителя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.createSettingsSubagent('payments', 'missing-agent', 'context'),
    (error: unknown) =>
      error instanceof NotFoundException && error.message === 'Агент не найден',
  );
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/missing-agent/context')));
});

test('createSettingsSubagent отклоняет некорректное имя', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.createSettingsSubagent('payments', 'analyst', 'Bad Name'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Имя сабагента — kebab-case',
  );
});

test('deleteSettingsSubagent отклоняет отсутствующий каталог', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.deleteSettingsSubagent('payments', 'analyst', 'context'),
    (error: unknown) =>
      error instanceof NotFoundException && error.message === 'Сабагент не найден',
  );
});

test('renameSettingsAgent переносит каталог и обновляет оркестратор и пути', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.renameSettingsAgent('payments', 'analyst', 'product-analyst');
  assert.equal(result.path, 'docs/payments/settings/product-analyst');
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/analyst')));
  await stat(join(root, 'docs/payments/settings/product-analyst'));
  const orchestrator = await readFile(join(root, 'docs/payments/settings/orchestrator.md'), 'utf8');
  assert.match(orchestrator, /\| `product-analyst\.md` \| `settings\/product-analyst\/` \|/);
  assert.doesNotMatch(orchestrator, /settings\/analyst\//);
  const parentAgent = await readFile(
    join(root, 'docs/payments/settings/product-analyst/agent.md'),
    'utf8',
  );
  assert.match(
    parentAgent,
    /`settings\/product-analyst\/acceptance\/`/,
  );
  const template = await readFile(
    join(root, 'docs/payments/settings/product-analyst/template.md'),
    'utf8',
  );
  assert.match(template, /^role: product-analyst$/m);
});

test('renameSettingsAgent отклоняет имя при занятом каталоге', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.renameSettingsAgent('payments', 'analyst', 'designer'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Агент уже существует',
  );
  await stat(join(root, 'docs/payments/settings/analyst'));
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/product-analyst')));
});

test('renameSettingsSubagent переименовывает каталог и строку в agent.md', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const orchestratorBefore = await readFile(
    join(root, 'docs/payments/settings/orchestrator.md'),
    'utf8',
  );
  const result = await documents.renameSettingsSubagent('payments', 
    'analyst',
    'acceptance',
    'criteria',
  );
  assert.equal(result.path, 'docs/payments/settings/analyst/criteria');
  await assert.rejects(() => stat(join(root, 'docs/payments/settings/analyst/acceptance')));
  await stat(join(root, 'docs/payments/settings/analyst/criteria'));
  const parentAgent = await readFile(join(root, 'docs/payments/settings/analyst/agent.md'), 'utf8');
  assert.match(
    parentAgent,
    /\| `criteria` \| `settings\/analyst\/criteria\/` \|/,
  );
  assert.doesNotMatch(parentAgent, /acceptance/);
  const orchestratorAfter = await readFile(
    join(root, 'docs/payments/settings/orchestrator.md'),
    'utf8',
  );
  assert.equal(orchestratorAfter, orchestratorBefore);
});

test('renameSettingsAgent отклоняет пустое nextName', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.renameSettingsAgent('payments', 'analyst', ''),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Имя агента — kebab-case',
  );
});

test('copySettingsAgents копирует каталог с именем проекта и сабагента', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await documents.createSettingsAgent('payments', 'review');
  await documents.createSettingsSubagent('payments', 'review', 'context');
  const result = await documents.copySettingsAgents('billing', 'payments', ['review']);
  assert.deepEqual(result.paths, ['docs/billing/settings/review-payments']);
  const template = await readFile(
    join(root, 'docs/billing/settings/review-payments/template.md'),
    'utf8',
  );
  assert.match(template, /role: review-payments/);
  await stat(join(root, 'docs/billing/settings/review-payments/context/agent.md'));
  const parentAgent = await readFile(
    join(root, 'docs/billing/settings/review-payments/agent.md'),
    'utf8',
  );
  assert.match(parentAgent, /settings\/review-payments\/context\//);
  const billingAfter = await readFile(
    join(root, 'docs/billing/settings/orchestrator.md'),
    'utf8',
  );
  assert.match(billingAfter, /\| `review-payments\.md` \| `settings\/review-payments\/` \|/);
  assert.match(billingAfter, /\| `analyst\.md` \| `settings\/analyst\/` \|/);
  await stat(join(root, 'docs/payments/settings/review'));
  await assert.rejects(() => stat(join(root, 'docs/billing/settings/review')));
});

test('copySettingsAgents не копирует повторно ту же директорию', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const analystBefore = await readFile(
    join(root, 'docs/billing/settings/analyst/template.md'),
    'utf8',
  );
  await documents.copySettingsAgents('billing', 'payments', ['analyst']);
  await assert.rejects(
    () => documents.copySettingsAgents('billing', 'payments', ['analyst']),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Агент уже существует',
  );
  const analystAfter = await readFile(
    join(root, 'docs/billing/settings/analyst/template.md'),
    'utf8',
  );
  assert.equal(analystAfter, analystBefore);
  await stat(join(root, 'docs/billing/settings/analyst-payments'));
});

test('copySettingsAgents отклоняет тот же проект и пустой список', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.copySettingsAgents('payments', 'payments', ['analyst']),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Выберите другой проект',
  );
  await assert.rejects(
    () => documents.copySettingsAgents('billing', 'payments', []),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Выберите агента',
  );
});

test('createEpic создаёт пустой каталог и отклоняет повтор', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const created = await documents.createEpic('payments', 'checkout');
  assert.equal(created.path, 'docs/payments/checkout');
  const described = await documents.describe('docs/payments/checkout');
  assert.equal(described.kind, 'epic');
  await assert.rejects(
    () => documents.createEpic('payments', 'checkout'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Эпик уже существует',
  );
  await assert.rejects(
    () => documents.createEpic('payments', 'settings'),
    (error: unknown) =>
      error instanceof BadRequestException && error.message === 'Имя эпика — kebab-case',
  );
});

test('createFeature без эпика не создаёт каталог', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  await assert.rejects(
    () => documents.createFeature('payments', 'missing', 'new-card'),
    (error: unknown) =>
      error instanceof NotFoundException && error.message === 'Эпик не найден',
  );
  await assert.rejects(() => stat(join(root, 'docs/payments/missing')));
  await assert.rejects(() => stat(join(root, 'docs/payments/new-card')));
});

test('createDocLink создаёт symlink на проект вне репозитория', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const outside = await mkdtemp(join(tmpdir(), 'sdd-doc-link-'));
  try {
    const created = await documents.createDocLink('payments', outside);
    const linkPath = join(await realpath(outside), 'payments');
    assert.equal(created.path, linkPath);
    assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
    assert.equal(await realpath(linkPath), await realpath(join(root, 'docs/payments')));
    const listing = await documents.listDocLinkDirectory('payments', outside);
    assert.deepEqual(
      listing.links.find((link) => link.name === 'payments')?.target,
      await realpath(join(root, 'docs/payments')),
    );
    await assert.rejects(
      () => documents.createDocLink('payments', outside),
      (error: unknown) =>
        error instanceof BadRequestException && error.message === 'Ссылка уже существует',
    );
    await assert.rejects(
      () => documents.createDocLink('payments', join(root, 'docs')),
      (error: unknown) =>
        error instanceof BadRequestException && error.message === 'Выберите другой каталог',
    );
  } finally {
    await rm(outside, { recursive: true, force: true });
  }
});

test('renameFeature оставляет фичу в том же эпике', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const result = await documents.renameFeature('docs/billing/main/invoices', 'bills');
  assert.equal(result.path, 'docs/billing/main/bills');
  await assert.rejects(() => stat(join(root, 'docs/billing/bills')));
  await stat(join(root, 'docs/billing/main/bills/ready-to-implement/analyst.md'));
});

test('скриншот с адресом Pixo возвращает ссылку-картинку', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const linked = await documents.saveAsset(
    'docs/payments/main/order-list',
    'day.png',
    Buffer.from('png'),
    'https://pixo.example/order-list',
  );
  assert.match(
    linked.markdown,
    /^\[!\[day\]\(\.\.\/assets\/\d+-day\.png\)\]\(https:\/\/pixo\.example\/order-list\)$/,
  );
  const bare = await documents.saveAsset(
    'docs/payments/main/order-list',
    'day.png',
    Buffer.from('png'),
  );
  assert.match(bare.markdown, /^!\[\]\(\.\.\/assets\/\d+-day\.png\)$/);
  await assert.rejects(
    () =>
      documents.saveAsset(
        'docs/payments/main/order-list',
        'day.png',
        Buffer.from('png'),
        'pixo.example/order-list',
      ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'Адрес Pixo должен начинаться с http:// или https://',
  );
});
