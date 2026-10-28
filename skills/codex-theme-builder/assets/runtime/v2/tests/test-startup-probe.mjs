import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const source=fs.readFileSync(fileURLToPath(new URL('../scripts/injector.mjs',import.meta.url)),'utf8');
const probe=source.slice(source.indexOf('async function probeSession('),source.indexOf('async function connectTarget('));
const shell=({header=true,semantic=true,visible=true}={})=>({
 querySelector:()=>header?{}:null,
 closest:selector=>selector.includes('active-page')&&!visible?{}:null,
 getBoundingClientRect:()=>({width:visible?900:0}),
 matches:()=>semantic,
});
async function run(shells,{protocol='app:',composer=false}={}){
 const document={querySelectorAll:()=>shells,querySelector:selector=>composer&&selector==='.composer-surface-chrome'?{}:null,getElementById:()=>null};
 const context=vm.createContext({document,location:{protocol}});
 const session={evaluate:expression=>vm.runInContext(expression,context)};
 vm.runInContext(probe+';globalThis.probeSession=probeSession;',context);
 return context.probeSession(session);
}
assert.equal((await run([shell()])).codex,true,'semantic shell can mount before composer without delaying injection');
assert.equal((await run([shell({header:false})])).codex,false,'signed-out/unanchored main remains native');
assert.equal((await run([shell()],{protocol:'https:'})).codex,false,'non-app protocol remains rejected');
assert.equal((await run([shell({visible:false}),shell()])).codex,true,'hidden retained Home must not block active shell');
assert.equal((await run([shell({visible:false})])).codex,false);
assert.equal((await run([shell({semantic:false})],{composer:true})).codex,true,'legacy composer fallback stays supported');
assert.equal((await run([shell({semantic:false})])).codex,false,'generic main without authenticated content remains rejected');
const connect=source.slice(source.indexOf('async function connectCodexTargets('),source.indexOf('async function applyToSession('));
let now=0,closed=0;
const context=vm.createContext({options:{browserId:'original'},Date:{now:()=>now+=100},setTimeout:fn=>fn(),
 listAppTargets:async()=>[{id:'page'}],connectTarget:async()=>({close:()=>closed++}),
 probeSession:async()=>({codex:false,markers:{shell:false,header:false}}),CdpIdentityMismatchError:class extends Error{}});
vm.runInContext(connect+';globalThis.connectCodexTargets=connectCodexTargets;',context);
await assert.rejects(context.connectCodexTargets(55555,500),/"shell":false/);
assert.ok(closed>0,'rejected transient sessions must close');
console.log('PASS: composer-delayed startup, auth/protocol gates, hidden pages, legacy shell, and actionable marker diagnostics.');
