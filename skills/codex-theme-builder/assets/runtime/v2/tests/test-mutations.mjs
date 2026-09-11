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
 const context={Node:{ELEMENT_NODE:1}, root:{classList:{contains:()=>true}},themeSuspendedForNativeSurface:false,themeCatalog:[{},{}],SWITCHER_ID:'switcher',detailState:{},
  document:{querySelector:()=>{counts.queries++;return null},getElementById:()=>{counts.queries++;return null}},
  mutationIsRuntimeOwned:m=>m.owned,mutationIsComposerTyping:m=>m.typing,mutationRemovedSwitcher:m=>m.switcher,
  mutationNeedsFullEnsure:m=>m.structural,markCompatibleComposersIn:()=>counts.composers++,scheduleEnsure:()=>counts.scheduled++,
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
