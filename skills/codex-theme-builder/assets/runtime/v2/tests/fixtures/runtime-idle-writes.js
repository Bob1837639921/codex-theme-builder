(() => {
  const state = window.__CODEX_DREAM_SKIN_STATE__;
  if (!state || state.activeThemeId === 'native') throw Error('Run against an active visual theme');
  state.ensure();
  const observer = new MutationObserver(() => {});
  observer.observe(document.documentElement, { attributes: true, attributeOldValue: true, subtree: true });
  try {
    state.detailState.conversationDetailsDirty = true;
    state.ensure();
    const records = observer.takeRecords();
    const unchanged = records.filter(m => m.oldValue === m.target.getAttribute(m.attributeName));
    if (unchanged.length) throw Error(`Idle theme check rewrote ${unchanged.length} unchanged DOM attributes`);
    return { pass: true, writes: records.length, unchangedWrites: unchanged.length };
  } finally { observer.disconnect(); }
})()
