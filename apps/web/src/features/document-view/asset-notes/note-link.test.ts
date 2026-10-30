import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fragmentBrowserHref } from '../text-fragment';
import { embedNoteLinks, noteBlockHref, noteCropSource, normalizePastedNoteLinks } from './note-link';

test('ссылка note подставляется как метка блока', () => {
  const source = '| Наименование note:../assets/create-empty.png[3] | максимум';
  const html = embedNoteLinks(source);
  assert.match(html, /class="asset-note-ref"/);
  assert.match(html, /data-image="\.\.\/assets\/create-empty\.png"/);
  assert.match(html, /data-note="3"/);
  assert.match(html, /pass:\[<span/);
});

test('в листинге ссылка note остаётся текстом', () => {
  const source = ['----', 'note:../assets/create-empty.png[3]', '----'].join('\n');
  assert.equal(embedNoteLinks(source), source);
});

test('ссылка на блок указывает на прямоугольник в адресе страницы', () => {
  const href = noteBlockHref(
    'http://localhost:3000/?project=ermo&path=docs%2Fermo%2Fanalyst.adoc',
    'docs/ermo/assets/registry.png',
    3,
  );
  assert.equal(
    href,
    'http://localhost:3000/?project=ermo&path=docs%2Fermo%2Fanalyst.adoc&noteImage=docs%2Fermo%2Fassets%2Fregistry.png&note=3#asset-note-docs-ermo-assets-registry-png-3-block',
  );
});

test('вставка note: url становится ссылкой adoc', () => {
  const documentPath = 'docs/ermo/complaint/feature/in-progress/analyst.adoc';
  const href = noteBlockHref(
    'http://localhost:3000/?project=ermo&path=docs%2Fermo%2Fcomplaint%2Ffeature%2Fin-progress%2Fanalyst.adoc',
    'docs/ermo/complaint/feature/assets/create-empty.png',
    12,
  );
  assert.equal(
    normalizePastedNoteLinks(`Наименование note: ${href}`, documentPath),
    'Наименование note:../assets/create-empty.png[12]',
  );
  assert.equal(
    normalizePastedNoteLinks(`note:${href}`, documentPath),
    'note:../assets/create-empty.png[12]',
  );
  assert.equal(
    normalizePastedNoteLinks(href, documentPath),
    'note:../assets/create-empty.png[12]',
  );
  assert.equal(
    normalizePastedNoteLinks('Наименование note:../assets/create-empty.png[3]', documentPath),
    'Наименование note:../assets/create-empty.png[3]',
  );
  const addressBar = [
    'http://localhost:3000/?project=ermo',
    '&path=docs%2Fermo%2Fcomplaint%2Fcomplaint-templates-urfu-urfmi%2Fin-progress%2Fanalyst.adoc',
    '&open=docs%2Fermo',
    '#asset-note-docs-ermo-complaint-complaint-templates-urfu-urfmi-assets-create-empty-png-3-block',
  ].join('');
  const analyst = 'docs/ermo/complaint/complaint-templates-urfu-urfmi/in-progress/analyst.adoc';
  assert.equal(
    normalizePastedNoteLinks(`Наименование шаблона ${addressBar}`, analyst),
    'Наименование шаблона note:../assets/create-empty.png[3]',
  );
  const fragmentHref = fragmentBrowserHref(
    `http://localhost:3000/?project=ermo&path=${encodeURIComponent(analyst)}`,
    'виден список',
  );
  assert.equal(
    normalizePastedNoteLinks(`см ${fragmentHref}`, analyst),
    `см xref:analyst.adoc#t=${encodeURIComponent('виден список')}[виден список]`,
  );
});

test('кадр блока берёт прямоугольник с небольшим полем', () => {
  const crop = noteCropSource({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, 1000, 500);
  assert.equal(crop.sx, 92);
  assert.equal(crop.sy, 92);
  assert.equal(crop.sw, 316);
  assert.equal(crop.sh, 216);
});
