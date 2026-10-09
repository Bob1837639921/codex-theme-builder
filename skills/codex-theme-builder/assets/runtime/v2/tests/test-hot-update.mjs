import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(root, 'scripts/injector.mjs'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const context = vm.createContext({fs, path, root, Buffer, randomUUID, setTimeout,
  MAX_ART_BYTES:8*1024*1024, MAX_VIDEO_BYTES:8*1024*1024,
  ASSET_ORIGIN:'https://codex-dream-skin.invalid', SKIN_VERSION:'test',
  RELOAD_BINDING_NAME:'__CODEX_DREAM_SKIN_RELOAD__',window:{}});
vm.runInContext([
  extract('function createAssetRegistry()', 'function requestHeader('),
  extract('async function loadThemePackage(', 'async function probeSession('),
  extract('async function requestHotReload(', 'async function runOneShot('),
  'globalThis.api = {createAssetRegistry, loadPayload, requestHotReload};',
].join('\n'), context);
const {createAssetRegistry,loadPayload,requestHotReload}=context.api;
const registry=createAssetRegistry();
const payload=await loadPayload(path.resolve(root,'../../themes/ink-landscape'),registry);
assert.ok(Buffer.byteLength(payload)<1024*1024);
assert.equal(/data:(?:image\/(?:png|jpe?g|webp)|video\/mp4);base64,/i.test(payload),false);
assert.ok(registry.size>0);
await assert.rejects(loadPayload('/unused'),/persistent lazy asset registry/);
assert.ok(!extract('async function runOneShot(', 'async function runWatch(').includes('loadPayload('),
  'short-lived one-shot process must never build an embedded catalog');
const service=createAssetRegistry();
let old=service.register('theme','home.webp','/home.webp','image/webp');
let older;
for(let i=0;i<5;i++){
  const next=createAssetRegistry();
  const current=next.register('theme','home.webp',`/home-${i}.webp`,'image/webp');
  assert.notEqual(current,old,'changed assets bypass stale browser cache');
  service.adopt(next);
  assert.ok(service.resolve(old),'one outgoing generation remains available during handoff');
  assert.ok(service.resolve(current));
  if(older)assert.equal(service.resolve(older),null,'older generations must not accumulate');
  assert.equal(service.resolve(current+'?unexpected=1'),null);
  assert.equal(service.size,1);
  older=old;old=current;
}
const options={themeDir:'/themes/ink-landscape',timeoutMs:1000};
const session={evaluate:async expression=>vm.runInContext(expression,context)};
await assert.rejects(requestHotReload(session,options),/persistent asset service/);
context.window.__CODEX_DREAM_SKIN_RELOAD_SERVICE__={version:'test'};
context.window.__CODEX_DREAM_SKIN_RELOAD__=message=>{
  const request=JSON.parse(message);
  assert.equal(request.themeDir,options.themeDir);
  context.window[`__DREAM_HOT_RESULT_${request.id}`]={pass:true,payloadBytes:500000};
};
assert.equal((await requestHotReload(session,options)).payloadBytes,500000);
assert.equal(Object.keys(context.window).filter(k=>k.startsWith('__DREAM_HOT_RESULT_')).length,0);
context.window.__CODEX_DREAM_SKIN_RELOAD__=message=>{
  const request=JSON.parse(message);
  context.window[`__DREAM_HOT_RESULT_${request.id}`]={pass:false,error:'invalid asset'};
};
await assert.rejects(requestHotReload(session,options),/invalid asset/);
assert.equal(Object.keys(context.window).filter(k=>k.startsWith('__DREAM_HOT_RESULT_')).length,0);
const runtimeSource=await fs.readFile(path.join(root,'assets/runtime.js'),'utf8');
const replacement=runtimeSource.slice(0,runtimeSource.indexOf('  themeCatalog ='));
assert.ok(replacement.includes('previous?.cleanup?.()'), 'replacement must retire old Home control closures');
assert.ok(replacement.includes('previous = null;'), 'replacement must drop the previous runtime reference');
console.log('PASS: metadata-only hot update, persistent-service delegation, bounded asset generations, changed-asset cache busting, and request cleanup.');
