// node tests/startup.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script id="station-startup">([\s\S]*?)<\/script>/)[1];
function fixture(){
 const elements=new Map();
 for(const id of ['loading-message','loading-slow','loading3d','fallback3d']){
  const classes=new Set();elements.set(id,{hidden:true,textContent:'',classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)}});
 }
 const listeners={},buttons=[{},{}];let timer,cleared=false,reloads=0;
 const window={addEventListener:(type,fn)=>listeners[type]=fn,location:{reload:()=>reloads++}};
 const document={getElementById:id=>elements.get(id),querySelectorAll:()=>buttons.map(b=>({addEventListener:(_,fn)=>b.click=fn}))};
 vm.runInNewContext(source,{window,document,setTimeout:fn=>(timer=fn,1),clearTimeout:()=>cleared=true});
 return {window,elements,listeners,buttons,timeout:()=>timer(),cleared:()=>cleared,reloads:()=>reloads};
}
const slow=fixture();slow.timeout();
assert.equal(slow.window.__station3dStatus,'loading');
assert.equal(slow.elements.get('loading-slow').hidden,false);
assert.equal(slow.elements.get('fallback3d').classList.contains('show'),false,'slow startup must not trigger a false failure');
slow.elements.get('fallback3d').classList.add('show');slow.window.__station3dComplete();
assert.equal(slow.window.__station3dReady,true);
assert.equal(slow.elements.get('fallback3d').classList.contains('show'),false,'successful startup clears stale fallback');
assert.equal(slow.cleared(),true);slow.timeout();assert.equal(slow.window.__station3dStatus,'ready');
for(const event of ['error','unhandledrejection']){
 const f=fixture();f.listeners[event]({message:'Module failed'});
 assert.equal(f.window.__station3dStatus,'failed');assert.ok(f.elements.get('fallback3d').classList.contains('show'));
 assert.ok(f.elements.get('loading3d').classList.contains('done'));
 f.buttons.forEach(b=>b.click());assert.equal(f.reloads(),2);
}
assert.ok(html.indexOf('tick();\nwindow.__station3dComplete();')>0,'ready must follow first rendered frame');
console.log('PASS: slow startup, stale overlay recovery, failed imports, rejected startup, retry buttons and first-frame readiness');
