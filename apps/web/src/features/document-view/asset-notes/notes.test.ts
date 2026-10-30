import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fractionFromCss,
  hitNoteCircle,
  hitNoteEdit,
  noteEditCursor,
  imagePathFromRawSrc,
  layoutBox,
  noteElementId,
  isNotesPathChange,
  notesPathForImage,
  parseAssetNotes,
  serializeAssetNotes,
} from './notes';

test('разбор yaml сохраняет порядок и доли', () => {
  const notes = parseAssetNotes(`
notes:
  - text: Кнопка «Создать шаблон»
    x: 0.72
    y: 0.02
    w: 0.2
    h: 0.08
  - text: Фильтры
    x: 1.4
    y: -0.2
    w: 0.1
    h: 0.1
`);
  assert.equal(notes.length, 2);
  assert.deepEqual(notes[0]?.comments, ['Кнопка «Создать шаблон»']);
  assert.equal(notes[0]?.x, 0.72);
  assert.equal(notes[1]?.x, 1);
  assert.equal(notes[1]?.y, 0);
  assert.deepEqual(parseAssetNotes(serializeAssetNotes(notes)), notes);
});

test('несколько комментариев читаются списком, старый text остаётся первым', () => {
  const notes = parseAssetNotes(`
notes:
  - comments:
      - Кнопка видна только на этой вкладке.
      - На остальных вкладках её нет.
    x: 0.1
    y: 0.1
    w: 0.2
    h: 0.2
`);
  assert.deepEqual(notes[0]?.comments, [
    'Кнопка видна только на этой вкладке.',
    'На остальных вкладках её нет.',
  ]);
});

test('битый yaml и запись без чисел не попадают в список', () => {
  assert.deepEqual(parseAssetNotes('notes: ['), []);
  assert.deepEqual(parseAssetNotes('notes:\n  - text: без координат\n'), []);
});

test('путь заметок стоит рядом с png', () => {
  const imagePath = 'docs/ermo/complaint/feature/assets/registry.png';
  assert.equal(
    notesPathForImage(imagePath),
    'docs/ermo/complaint/feature/assets/registry.notes.yaml',
  );
  assert.equal(
    isNotesPathChange(['docs/ermo/complaint/feature/assets/registry.notes.yaml'], imagePath),
    true,
  );
  assert.equal(isNotesPathChange(['docs/ermo/complaint/feature/in-progress/analyst.adoc'], imagePath), false);
  assert.equal(
    imagePathFromRawSrc('/api/raw?path=docs%2Fermo%2Fassets%2Fregistry.png'),
    'docs/ermo/assets/registry.png',
  );
  assert.equal(imagePathFromRawSrc('/api/raw?path=docs%2Ffile.adoc'), null);
});

test('кружок в левом верхнем углу прямоугольника принимает клик', () => {
  const box = layoutBox(100, 100, 124);
  const notes = [{ text: 'поле', x: 0, y: 0, w: 0.4, h: 0.2 }];
  assert.equal(hitNoteCircle(12, 12, notes, box), 0);
  assert.equal(hitNoteCircle(40, 40, notes, box), null);
  assert.equal(noteElementId('docs/ermo/assets/registry.png', 1), 'asset-note-docs-ermo-assets-registry-png-1');
});

test('наведение на блок, край и угол выбирает своё действие', () => {
  const box = layoutBox(100, 100, 124);
  const notes = [{ text: 'поле', x: 0, y: 0, w: 0.4, h: 0.2 }];
  assert.deepEqual(hitNoteEdit(32, 22, notes, box), { index: 0, kind: 'move' });
  assert.equal(noteEditCursor(hitNoteEdit(32, 22, notes, box)), 'move');
  assert.deepEqual(hitNoteEdit(52, 32, notes, box), { index: 0, kind: 'resize', edge: 'se' });
  assert.equal(noteEditCursor(hitNoteEdit(52, 32, notes, box)), 'nwse-resize');
  assert.deepEqual(hitNoteEdit(52, 22, notes, box), { index: 0, kind: 'resize', edge: 'e' });
  assert.equal(noteEditCursor(hitNoteEdit(52, 22, notes, box)), 'ew-resize');
  assert.deepEqual(hitNoteEdit(32, 12, notes, box), { index: 0, kind: 'resize', edge: 'n' });
  assert.equal(noteEditCursor(hitNoteEdit(32, 12, notes, box)), 'ns-resize');
  assert.equal(hitNoteEdit(0, 0, notes, box), null);
  assert.equal(noteEditCursor(null), 'crosshair');
  const thin = [{ text: 'строка', x: 0, y: 0, w: 0.8, h: 0.1 }];
  assert.deepEqual(hitNoteEdit(52, 17, thin, box), { index: 0, kind: 'move' });
  assert.deepEqual(hitNoteEdit(52, 12, thin, box), { index: 0, kind: 'resize', edge: 'n' });
});

test('точка канваса переводится в долю снимка', () => {
  const box = layoutBox(200, 100, 224);
  const point = fractionFromCss(box.pad + 50, box.pad + 25, box);
  assert.equal(point.x, 0.25);
  assert.equal(point.y, 0.25);
});
