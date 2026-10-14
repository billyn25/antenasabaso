import fs from 'node:fs';
import {provinces} from '../content/municipios.mjs';

const DOMAIN='https://antenasabaso.com';
const timeout=12000;
const failures=[];
const report=[];
const check=async(url,redirect='follow')=>{
 const response=await fetch(url,{redirect,signal:AbortSignal.timeout(timeout),headers:{'user-agent':'AntenasAbaso-SEO-Audit/1.0'}});
 return response;
};
const run=async(label,fn)=>{
 try{await fn();report.push({label,ok:true});console.log('OK',label)}
 catch(e){failures.push({label,error:e.message});console.error('ERROR',label,e.message)}
};
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const extract=(xml)=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
const manifest=provinces.map(p=>({slug:p.slug,count:p.towns.length}));
await run('robots producción',async()=>{
 const r=await check(DOMAIN+'/robots.txt');assert(r.status===200,'HTTP '+r.status);
 const s=await r.text();assert(!/^Disallow:\s*\/$/mi.test(s),'Disallow /');
 assert(s.includes('Sitemap: '+DOMAIN+'/sitemap.xml'),'Sitemap ausente');
 assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),'X-Robots noindex');
});
let all=[];
await run('índice de sitemaps',async()=>{
 const r=await check(DOMAIN+'/sitemap.xml');assert(r.status===200,'HTTP '+r.status);
 const urls=extract(await r.text());
 const expected=[DOMAIN+'/sitemaps/principal.xml',...manifest.map(p=>DOMAIN+'/sitemaps/'+p.slug+'.xml')];
 assert(urls.length===expected.length,'Hijos '+urls.length+' en vez de '+expected.length);
 for(const url of expected)assert(urls.includes(url),'Falta '+url);
});
for(const p of manifest)await run('sitemap '+p.slug,async()=>{
 const r=await check(DOMAIN+'/sitemaps/'+p.slug+'.xml');assert(r.status===200,'HTTP '+r.status);
 const urls=extract(await r.text());
 assert(urls.length===p.count+1,'URLs '+urls.length+' en vez de '+(p.count+1));
 assert(urls.includes(DOMAIN+'/'+p.slug+'/'),'Hub ausente');
 all.push(...urls);
});
await run('sitemap principal',async()=>{
 const r=await check(DOMAIN+'/sitemaps/principal.xml');assert(r.status===200,'HTTP '+r.status);
 const urls=extract(await r.text());assert(urls.length===1&&urls[0]===DOMAIN+'/','Portada incoherente');all.push(...urls);
});
await run('unicidad y cobertura',async()=>{
 const expected=1+manifest.length+manifest.reduce((n,p)=>n+p.count,0);
 assert(all.length===expected,'Total '+all.length+' en vez de '+expected);
 assert(new Set(all).size===all.length,'URLs duplicadas');
});
const sample=[DOMAIN+'/',...manifest.map(p=>DOMAIN+'/'+p.slug+'/'),...all.filter(x=>x.split('/').length>5).slice(0,12)];
for(const url of [...new Set(sample)])await run('URL canónica '+new URL(url).pathname,async()=>{
 const r=await check(url,'manual');assert(r.status===200,'HTTP '+r.status+' (redirección en sitemap)');
 assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),'X-Robots noindex');
 const html=await r.text();
 assert(/<meta name="robots" content="index,follow"/.test(html),'Meta robots no indexable');
 assert(html.includes('<link rel="canonical" href="'+url+'"'),'Canonical distinto de URL');
});
for(const url of [DOMAIN+'/index.html',...manifest.slice(0,3).map(p=>DOMAIN+'/'+p.slug+'/index.html')])await run('alias index.html '+new URL(url).pathname,async()=>{
 const r=await check(url,'manual');assert([301,308].includes(r.status),'Esperado 301/308, recibido '+r.status);
 const dest=new URL(r.headers.get('location'),url);
 assert(dest.origin===DOMAIN,'Destino fuera del dominio');
});
const result={checkedAt:new Date().toISOString(),domain:DOMAIN,passed:report.length,failed:failures.length,failures};
fs.writeFileSync('abaso-live-seo-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
