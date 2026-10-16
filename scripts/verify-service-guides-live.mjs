/** Public HTTP reads only. Compiled tests are not proof of Google's index. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {guides,extraRoutes,GUIDE_CSS_PATH} from './service-guides.mjs';
const base='https://antenasabaso.com',report={domain:base,commit:process.env.GITHUB_SHA||null,pages:[],sitemaps:[],ok:false};
const towns=JSON.parse(fs.readFileSync('dist/local-pages-manifest.json'));
const provinces=[...new Set(towns.map(t=>t.provinceSlug))];
const routes=new Set(['/',...extraRoutes,...provinces.map(p=>'/'+p+'/'),'/bizkaia/balmaseda/','/bizkaia/zalla/','/burgos/lerma/','/cantabria/reinosa/','/aviso-legal/','/privacidad/','/cookies/']);
for(const p of provinces){const local=towns.filter(t=>t.provinceSlug===p);routes.add(local[0].path);routes.add(local.at(-1).path);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(route){const r=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200,route+': HTTP '+r.status);return {r,text:await r.text()};}
try{
 let ready=false;
 for(let i=0;i<30;i++){try{const {text}=await read('/servicios/reparacion-antenas-tdt/');assert(text.includes(GUIDE_CSS_PATH));ready=true;break;}catch(e){report.lastObservation=e.message;if(i<29)await pause(8000);}}
 assert(ready,'No se ha confirmado la publicación de las guías');
 const arr=[...routes];let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<arr.length){const route=arr[next++];let error;
  for(let trial=0;trial<3;trial++){try{const {r,text}=await read(route),local=fs.readFileSync('dist'+route+'index.html','utf8');
   for(const re of [/<title>[\s\S]*?<\/title>/,/<meta name="description"[^>]*>/,/<meta name="robots"[^>]*>/,/<link rel="canonical"[^>]*>/,/<main\b[^>]*>[\s\S]*?<\/main>/])assert.equal(text.match(re)?.[0],local.match(re)?.[0],route+': HTML publicado distinto');
   if(!local.includes('content="noindex,follow"'))assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),route+': bloqueo HTTP');
   const phones=[...text.matchAll(/href="tel:([^" ]+)"/g)].map(m=>m[1]);assert(phones.length);assert(phones.every(x=>x==='+34670042626'));
   report.pages.push({url:base+route,status:r.status,mainAndMetadataMatch:true,phoneCorrect:true,ok:true});error=null;break;
  }catch(e){error=e;if(trial<2)await pause(1000);}}
  if(error)report.pages.push({url:base+route,ok:false,error:error.message});
 }}));
 for(const route of ['/sitemap.xml',...['principal',...provinces].map(s=>'/sitemaps/'+s+'.xml'),'/robots.txt']){const {text}=await read(route);assert.equal(text,fs.readFileSync('dist'+route,'utf8'),route+': rastreo publicado distinto');report.sitemaps.push({route,ok:true});}
 const {text:css}=await read(GUIDE_CSS_PATH);assert.equal(css,fs.readFileSync('dist'+GUIDE_CSS_PATH,'utf8'));
 assert.equal(report.pages.length,routes.size);assert(report.pages.every(p=>p.ok));report.ok=true;
 console.log('GUÍAS PUBLICADAS OK:',report.pages.length,'páginas, 9 provincias y sus sitemaps; no equivale a indexación en Google.');
}catch(e){report.error=e.message;process.exitCode=1;console.error(e);}
finally{fs.mkdirSync('reports',{recursive:true});report.checkedAt=new Date().toISOString();report.pages.sort((a,b)=>a.url.localeCompare(b.url));fs.writeFileSync('reports/service-guides-live.json',JSON.stringify(report,null,2));}
