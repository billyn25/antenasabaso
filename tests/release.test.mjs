import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const source=process.cwd();
function fixture(env,fn){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'abaso-release-'));
  try{
    for(const file of ['scripts','content','assets','index.html','styles.css','site.js']) fs.cpSync(path.join(source,file),path.join(dir,file),{recursive:true});
    const isolated={...process.env};
    for(const key of ['SITE_MODE','URL','DEPLOY_PRIME_URL','CONTEXT','NETLIFY']) delete isolated[key];
    const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env:{...isolated,...env},encoding:'utf8'});
    fn(result,dir,{...isolated,...env});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function checkOutput(result,dir,env,mode){
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'dist/build-manifest.json')));
  assert.equal(manifest.mode,mode);
  const audited=spawnSync(process.execPath,['scripts/audit.mjs'],{cwd:dir,env,encoding:'utf8'});
  assert.equal(audited.status,0,audited.stdout+audited.stderr);
}
test('preview por defecto: 252 localidades, noindex rastreable, sin sitemap ni redirecciones',()=>fixture({},(r,d,e)=>checkOutput(r,d,e,'preview')));
test('producción con URL real de Netlify: sitemap exacto de 256 URLs y legales fuera del índice',()=>fixture({NETLIFY:'true',CONTEXT:'production',SITE_MODE:'production',URL:'https://antenasabaso.com',DEPLOY_PRIME_URL:'https://antenasabaso.com'},(r,d,e)=>checkOutput(r,d,e,'production')));
for(const context of ['deploy-preview','branch-deploy']) test(`${context}: nunca hereda indexación aunque SITE_MODE sea production`,()=>fixture({CONTEXT:context,SITE_MODE:'production',URL:'https://antenasabaso.com',DEPLOY_PRIME_URL:'https://branch.example.netlify.app'},(r,d,e)=>checkOutput(r,d,e,'preview')));
test('bloquea una preview conectada al dominio real en producción',()=>fixture({CONTEXT:'production',URL:'https://antenasabaso.com'},r=>{assert.notEqual(r.status,0);assert.match(r.stderr,/activa SITE_MODE=production/);}));
test('rechaza un modo desconocido antes de generar archivos',()=>fixture({SITE_MODE:'prodution'},r=>{assert.notEqual(r.status,0);assert.match(r.stderr,/debe ser preview o production/);}));
test('fotografías originales locales verificadas y favicon raster válido',()=>{
  const sources=JSON.parse(fs.readFileSync('assets/gallery/sources.json'));
  assert.equal(sources.length,6);
  for(const item of sources){const data=fs.readFileSync('.'+item.file);assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');}
  const png=fs.readFileSync('assets/icons/favicon.png');assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),192);
});
function cookieFixture({dismissed=false,blocked=false}={}){
 const key='antenas-abaso-cookie-info-v1',store=new Map(dismissed?[[key,'hidden']]:[]);const callbacks={};
 const button={addEventListener:(name,cb)=>callbacks[name]=cb};
 const notice={hidden:true,querySelector:()=>button};
 const document={querySelector:()=>notice};
 const localStorage={getItem:k=>{if(blocked)throw Error('blocked');return store.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');store.set(k,v);}};
 vm.runInNewContext(fs.readFileSync('site.js','utf8'),{document,localStorage});return {notice,callbacks,store,key};
}
test('aviso informativo: primera visita, cierre persistente y posteriores visitas',()=>{
 const x=cookieFixture();assert.equal(x.notice.hidden,false);x.callbacks.click();assert.equal(x.notice.hidden,true);assert.equal(x.store.get(x.key),'hidden');assert.equal(cookieFixture({dismissed:true}).notice.hidden,true);
});
test('el aviso se puede cerrar aunque el navegador bloquee almacenamiento',()=>{const x=cookieFixture({blocked:true});assert.equal(x.notice.hidden,false);assert.doesNotThrow(()=>x.callbacks.click());assert.equal(x.notice.hidden,true);});
