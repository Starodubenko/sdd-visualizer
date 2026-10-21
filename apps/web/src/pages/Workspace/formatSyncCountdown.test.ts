import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatSyncCountdown } from './formatSyncCountdown';

test('formatSyncCountdown', () => {
  assert.equal(formatSyncCountdown(60), '1:00');
  assert.equal(formatSyncCountdown(45), '0:45');
  assert.equal(formatSyncCountdown(0), '0:00');
});
