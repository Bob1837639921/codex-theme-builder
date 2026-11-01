import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/runtime.js', import.meta.url), 'utf8');
const start = source.indexOf('      const nextMessageActionRows = new Set();');
const end = source.indexOf('      detailState.messageActionControls.forEach', start);
assert.ok(start > 0 && end > start);
// A style write invalidates layout; the next geometry read has to flush it.
// Model a long transcript, including shared rows and a standalone copy button.
let dirty = false, flushes = 0, reads = 0;
const classList = () => {
  const tokens = new Set();
  return { contains: token => tokens.has(token), add(token) { dirty = true; tokens.add(token); } };
};
const shell = {};
const controls = new Set();
const rows = [];
for (let i = 0; i < 100; i++) {
  const row = {
    parentElement: shell, classList: classList(),
    getBoundingClientRect() { reads++; if (dirty) { flushes++; dirty = false; } return { width: 300, height: 30 }; },
    querySelectorAll() { return buttons; },
  };
  const buttons = Array.from({ length: 4 }, () => ({ parentElement: row, classList: classList(), closest: () => null }));
  buttons.forEach(b => controls.add(b)); rows.push(row);
}
const standalone = { parentElement: shell, classList: classList(), closest: () => null };
controls.add(standalone);
const context = {
  nextMessageActionControls: controls, conversationShell: shell,
};
vm.runInNewContext(source.slice(start, end) + '\nglobalThis.rowCount = nextMessageActionRows.size;', context);
assert.equal(context.rowCount, 100, 'all multi-button rows retain their marker');
assert.equal(flushes, 0, '400 controls must not interleave style writes and geometry reads');
assert.equal(reads, 100, 'each shared action row is measured once');
assert.equal(dirty, true, 'markers are applied after measurement');
dirty = false;
vm.runInNewContext(source.slice(start, end), { ...context });
assert.equal(dirty, false, 'unchanged discovery must not rewrite existing markers');
reads = 0;
const nativeRow = { classList: classList() };
const nativeControls = new Set(Array.from({ length: 400 }, () => ({
  parentElement: nativeRow, classList: classList(), closest: () => nativeRow,
})));
vm.runInNewContext(source.slice(start, end), {
  nextMessageActionControls: nativeControls, conversationShell: { contains: () => true },
});
assert.equal(reads, 0, 'native toolbars must use their semantic row without geometry reads');
assert.equal(nativeRow.classList.contains('dream-message-action-row'), true);
console.log('PASS: 400 message actions measure each shared row once with zero write/read layout flushes; standalone copy remains styled.');
