import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../assets/runtime.js',import.meta.url),'utf8');
const start=source.indexOf('    const isOutputBoundary =');
const end=source.indexOf('    const outputMarkers =',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({document:{body:{}},innerWidth:1600,innerHeight:1000,getComputedStyle:n=>n.style});
vm.runInContext(source.slice(start,end)+';globalThis.find=findOutputContainer;globalThis.visible=intersectsViewport;',context);
function node({boundary=false,composer=false,width=400,height=300,dropdown=false,parent=null}={}) {
 return {matches:()=>boundary,querySelector:()=>composer?{}:null,parentElement:parent,
 classList:{contains:()=>dropdown},style:{position:'relative',pointerEvents:'auto',display:'block',visibility:'visible',opacity:'1'},
 getBoundingClientRect:()=>({left:10,top:10,right:width+10,bottom:height+10,width,height})};
}
for(const props of [{boundary:true},{composer:true}]) {
 const shell=node({...props,width:400,dropdown:true});
 const seed=node({width:40,height:20,parent:shell});
 assert.equal(context.find(seed),null,'Even a narrow painted main/composer container is not an output panel');
 assert.equal(context.visible(shell),false,'Cached shell markers must be invalidated');
}
const panel=node({dropdown:true});
const seed=node({width:40,height:20,parent:panel});
assert.equal(context.find(seed),panel,'Real output panel discovery remains supported');
assert.equal(context.visible(panel),true);
panel.getBoundingClientRect=()=>({left:0,top:0,right:1192,bottom:716,width:1192,height:716});
assert.equal(context.visible(panel),false,'A cached candidate that expands to viewport width must be rejected');
const hidden=node({dropdown:true});hidden.style.display='none';
assert.equal(context.visible(hidden),false);
assert.ok(source.includes('if (!intersectsViewport(node)) node.classList.remove("dream-output-panel")'));
console.log('PASS: output boundaries, narrow shell rejection, real panels, responsive cache invalidation and hidden cleanup.');
