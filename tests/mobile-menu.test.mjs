import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('mobile navigation opens, closes on selection and handles Escape independently of cookies',()=>{
 const events={};const attrs=new Map();let focused=false;
 const nav={addEventListener:(key,fn)=>events['nav-'+key]=fn};
 const header={dataset:{},querySelector:()=>nav,addEventListener:(key,fn)=>events[key]=fn};
 const button={closest:()=>header,setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),addEventListener:(key,fn)=>events['button-'+key]=fn,focus:()=>focused=true};
 const document={querySelector:s=>s==='[data-menu-toggle]'?button:null};
 vm.runInNewContext(fs.readFileSync('site.js','utf8'),{document});
 assert.equal(header.dataset.mobileNav,'ready');assert.equal(attrs.get('aria-expanded'),'false');
 events['button-click']();assert.equal(attrs.get('aria-expanded'),'true');
 events['nav-click']({target:{closest:()=>({})}});assert.equal(attrs.get('aria-expanded'),'false');
 events['button-click']();events.keydown({key:'Escape'});assert.equal(attrs.get('aria-expanded'),'false');assert(focused);
});
