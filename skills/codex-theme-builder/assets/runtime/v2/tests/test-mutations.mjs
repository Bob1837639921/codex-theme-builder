import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const runtimePath = process.argv[2];
const code = fs.readFileSync(runtimePath, 'utf8');
const observerCode = code.slice(code.indexOf('  const observer = new MutationObserver'), code.indexOf('  observer.observe(document.documentElement'));
const detailCode = code.slice(code.indexOf('  const requestDetailScansFor ='), code.indexOf('  const mutationNeedsFullEnsure ='));
function harness() {
 const counts={queries:0,composers:0,scheduled:0}; let callback;
 const context={Node:{ELEMENT_NODE:1},activeTheme:{id:'test'}, root:{classList:{contains:()=>true}},themeSuspendedForNativeSurface:false,themeCatalog:[{},{}],SWITCHER_ID:'switcher',detailState:{},
  document:{querySelector:()=>{counts.queries++;return null},getElementById:()=>{counts.queries++;return null}},
  mutationIsRuntimeOwned:m=>m.owned,mutationIsComposerTyping:m=>m.typing,mutationRemovedSwitcher:m=>m.switcher,
  mutationNeedsFullEnsure:m=>m.structural,invalidateConversationDetails:()=>{},markCompatibleComposersIn:()=>counts.composers++,scheduleEnsure:()=>counts.scheduled++,
  MutationObserver:class {constructor(fn){callback=fn}}};
 vm.runInNewContext(detailCode+observerCode,context);
 return {counts,context,run:ms=>callback(ms)};
}
const node={nodeType:1,childElementCount:0,textContent:'',matches:()=>false,querySelector:()=>null};
const mutation=(extra={})=>({addedNodes:[node],removedNodes:[],...extra});
for(const flag of ['owned','typing']) {
 const h=harness();for(let i=0;i<1000;i++) h.run([mutation({[flag]:true})]);
 assert.deepEqual(h.counts,{queries:0,composers:0,scheduled:0},flag+' fast path');
}
{
 const h=harness();h.run([mutation({typing:true}),mutation({owned:true}),mutation({structural:true})]);
 assert.equal(h.counts.composers,1);assert.equal(h.counts.scheduled,1);
}
{
 const h=harness();h.context.document.querySelector=()=>node;
 h.run([mutation({owned:true,switcher:true,addedNodes:[]})]);assert.equal(h.counts.scheduled,1,'removed switcher recovered');
}
{
 const h=harness();h.run([mutation({owned:true,switcher:true,addedNodes:[]})]);assert.equal(h.counts.scheduled,0,'collapsed sidebar stays absent');
}
{
 const h=harness();h.run([mutation({addedNodes:[{...node,matches:s=>s.includes('dialog')}]})]);
 assert.equal(h.context.detailState.stepGuideScanRequested,true);assert.equal(h.counts.scheduled,1,'dialog wakes discovery');
}
{
 const h=harness();h.run([mutation({addedNodes:[],structural:true,type:'attributes'})]);
 assert.equal(h.counts.scheduled,1,'selection changes reconcile');
}
{
 const h=harness();h.run([]);assert.deepEqual(h.counts,{queries:0,composers:0,scheduled:0});
}
console.log('PASS: 8 mutation scenarios; 1000 editor + 1000 theme-only batches perform zero document queries, composer scans, or ensure scheduling.');
const injector = fs.readFileSync(path.resolve(path.dirname(runtimePath), '../scripts/injector.mjs'), 'utf8');
const predicate = injector.match(/\.filter\(\(button\) => (!button\.closest\('\[aria-hidden="true"\]\.invisible'\))\)/)?.[1];
assert.ok(predicate, 'toolbar verifier excludes only native hidden measurement replicas');
for (const hidden of [true, false]) {
  assert.equal(vm.runInNewContext(predicate, {button:{closest:()=>hidden ? {} : null}}), !hidden);
}
const sameActionPredicate = injector.match(/const sameNativeAction = (Boolean\(hitButton[\s\S]*?toolbarButtonLabel\(button\)\));/)?.[1];
assert.ok(sameActionPredicate, 'overlapping native toolbar actions require an exact accessible-label match');
const button = {label: 'toggle-sidebar'};
const matchingButton = {label: 'toggle-sidebar'};
const differentButton = {label: 'toggle-panel'};
const evaluateSameAction = (hitButton, toolbarButtons) => vm.runInNewContext(sameActionPredicate, {
  button,
  hitButton,
  toolbarButtons,
  toolbarButtonLabel: candidate => candidate?.label || '',
  Boolean,
});
assert.equal(evaluateSameAction(matchingButton, [button, matchingButton]), true, 'same native action replica is accepted');
assert.equal(evaluateSameAction(differentButton, [button, differentButton]), false, 'different toolbar action is rejected');
assert.equal(evaluateSameAction(matchingButton, [button]), false, 'non-toolbar overlap is rejected');
assert.ok(injector.includes('hit: hit === button || button.contains(hit) || sameNativeAction'), 'real toolbar obstruction checks remain required');
console.log('PASS: hidden toolbar replicas, same-action overlap, and native obstruction guards.');

// Retained Home must never win over the visible thread, even if it appears first.
const shellDiscovery = code.slice(code.indexOf('  const isVisibleShellNode ='), code.indexOf('  const COMPOSER_SURFACE_SELECTOR'));
const siblingHeader = {};
const makeShell = (visible, legacy = false) => ({
  closest: selector => selector.includes('active-page') ? (visible ? null : {}) : {
    querySelector: () => ({closest: () => siblingHeader}),
  },
  getClientRects: () => visible ? [{}] : [],
  getBoundingClientRect: () => ({width: visible ? 900 : 0}),
  querySelector: () => legacy ? siblingHeader : null,
});
const hiddenHome = makeShell(false);
const activeThread = makeShell(true);
const discover = shells => vm.runInNewContext(shellDiscovery + '\nlocateNativeShellMain()', {
  document: {querySelectorAll: () => shells},
});
assert.equal(discover([hiddenHome, activeThread]), activeThread);
assert.equal(discover([hiddenHome]), null);
const legacyShell = makeShell(true, true);
assert.equal(discover([legacyShell]), legacyShell);
console.log('PASS: retained hidden Home, workspace sibling titlebar, and legacy direct titlebar.');

const structuralCode = code.slice(code.indexOf('  const mutationNeedsFullEnsure ='), code.indexOf('  const scheduleEnsure ='));
const sidebarTarget = {nodeType:1, closest: selector => selector.includes('aside') ? {} : null};
const decide = mutation => vm.runInNewContext(structuralCode + '\nmutationNeedsFullEnsure(mutation)', {
  Node:{ELEMENT_NODE:1}, mutation,
});
for (let index = 0; index < 1000; index++) {
  assert.equal(decide({target:sidebarTarget,addedNodes:[node],removedNodes:[],type:'childList'}), false);
}
const sidebarRow = {...node, matches: selector => selector.includes('sidebar-thread-row')};
assert.equal(decide({target:sidebarTarget,addedNodes:[sidebarRow],removedNodes:[],type:'childList'}), true);
assert.equal(decide({target:sidebarTarget,addedNodes:[],removedNodes:[sidebarRow],type:'childList'}), true);
assert.equal(decide({target:sidebarTarget,type:'attributes'}), true);
console.log('PASS: 1000 sidebar status updates skip full reconciliation; row mount/removal and selection still wake it.');

const invalidationCode = code.slice(code.indexOf('  const invalidateConversationDetails ='), code.indexOf('  const scheduleEnsure ='));
const cachedDetails = {conversationDetailsDirty:false};
const invalidate = mutations => vm.runInNewContext(invalidationCode + '\ninvalidateConversationDetails(mutations)', {
  Node:{ELEMENT_NODE:1},detailState:cachedDetails,mutations,
});
invalidate([{target:{nodeType:1,closest:()=>null}}]);
assert.equal(cachedDetails.conversationDetailsDirty,false,'sidebar and portal updates retain the conversation cache');
invalidate([{target:{nodeType:3,parentElement:{closest:()=>({})}}}]);
assert.equal(cachedDetails.conversationDetailsDirty,true,'conversation text replacement invalidates cached details');
console.log('PASS: conversation cache invalidation follows the mutated subtree.');

const markerPredicate = code.slice(code.indexOf('  const shellMarkersMissing ='), code.indexOf('  // React rewrites these native class'));
const markerNode = classes => ({classList:{contains:name=>classes.includes(name)}});
const checkMarkers = (classes,headerClasses=['app-header-tint'],header=false) => {
  const observedShell=markerNode(classes),observedHeader=markerNode(headerClasses);
  return vm.runInNewContext(markerPredicate+'\nshellMarkersMissing(target)',{
    observedShell,observedHeader,target:header?observedHeader:observedShell,
  });
};
assert.equal(checkMarkers([]),true,'React class replacement needs repair');
assert.equal(checkMarkers(['main-surface']),true,'route marker replacement needs repair');
assert.equal(checkMarkers(['main-surface','dream-conversation-shell']),false,'own repaired classes do not loop');
assert.equal(checkMarkers(['main-surface','dream-home-shell']),false,'Home markers are accepted');
assert.equal(checkMarkers([],[],true),true,'rewritten titlebar marker is repaired');
assert.equal(checkMarkers([],['app-header-tint'],true),false,'own titlebar write does not loop');
console.log('PASS: shell/titlebar class replacement repair and observer loop prevention.');

{
 const h=harness();h.context.activeTheme.id='native';
 for(let i=0;i<1000;i++)h.run([mutation({structural:true})]);
 assert.deepEqual(h.counts,{queries:0,composers:0,scheduled:0},'native mode bypasses theme discovery and reconciliation');
}
console.log('PASS: native mode skips theme scanning for 1000 native DOM updates.');
