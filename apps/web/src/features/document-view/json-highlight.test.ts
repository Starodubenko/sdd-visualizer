import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatJson, tokenizeJson } from './json-highlight';

test('formatJson pretty-prints valid JSON with two-space indent', () => {
  const pretty = formatJson('{"a":1,"ok":true}');
  assert.notEqual(pretty, null);
  assert.match(pretty!, /"a"/);
  assert.match(pretty!, /\n  /);
  assert.match(pretty!, /\b1\b/);
  assert.match(pretty!, /\btrue\b/);
});

test('tokenizeJson of pretty JSON includes key, number, and literal', () => {
  const pretty = formatJson('{"a":1,"ok":true}');
  assert.notEqual(pretty, null);
  const kinds = new Set(tokenizeJson(pretty!).map((token) => token.kind));
  assert.ok(kinds.has('key'));
  assert.ok(kinds.has('number'));
  assert.ok(kinds.has('literal'));
});

test('tokenizeJson treats string values as string, not key', () => {
  const pretty = formatJson('{"label":"hello"}');
  assert.notEqual(pretty, null);
  const stringTokens = tokenizeJson(pretty!).filter((token) => token.text === '"hello"');
  assert.equal(stringTokens.length, 1);
  assert.equal(stringTokens[0]?.kind, 'string');
});

test('formatJson returns null for invalid JSON', () => {
  assert.equal(formatJson('{'), null);
});
