import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {guides,guideRoute,extraRoutes,serviceGuideLinks,GUIDE_CSS_PATH} from './service-guides.mjs';
const root='dist',base='https://antenasabaso.com';
const build=JSON.parse(fs.readFileSync(root+'/build-manifest.json'));
const towns=JSON.parse(fs.readFileSync(root+'/local-pages-manifest.json'));
const htmlFor=route=>fs.readFileSync(path.join(root,route.slice(1),'index.html'),'utf8');
const hrefs=h=>[...h.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
assert.equal(guides.length,6);assert.equal(new Set(extraRoutes).size,7);assert.equal(build.htmlCount,1645);
const report={domain:base,mode:build.mode,checkedAt:new Date().toISOString(),guides:[],towns:towns.length,townGuideLinks:0,allPagesAtMostTwoClicks:true,ok:false};
for(const g of guides){
 const h=htmlFor(guideRoute(g));assert(h.includes('<h1>'+g.name+'</h1>'));
 assert(h.includes('href="'+GUIDE_CSS_PATH+'"'));
 assert.equal((h.match(/<h1\b/g)||[]).length,1);
 for(const id of ['presupuesto','preguntas','localidad','contacto',...g.sections.map(s=>s.id)])assert(h.includes('id="'+id+'"'));
 for(const [name,url] of g.sources)assert(hrefs(h).includes(url),name);
 for(const related of g.related)assert(hrefs(h).includes('/servicios/'+related+'/'));
 assert(!/aggregateRating|reviewCount|streetAddress|latitude|longitude/.test(h));
 for(const x of hrefs(h).filter(x=>x.startsWith('tel:')))assert.equal(x,'tel:+34670042626');
 for(const x of hrefs(h).filter(x=>x.startsWith('https://wa.me/')))assert.equal(new URL(x).pathname,'/34670042626');
 report.guides.push({route:guideRoute(g),sections:g.sections.length,faq:g.faq.length,ok:true});
}
assert.equal(towns.length,1624);
for(const t of towns){
 const h=htmlFor(t.path);
 assert(h.includes('Antenas, porteros y otros servicios en '+t.name));
 let count=0;
 for(const id of ['tdt','parabolicas','amplificacion','porteros','videoporteros']){
  const block=h.match(new RegExp('<article[^>]*id="servicio-'+id+'"[^>]*>([\\s\\S]*?)</article>'))?.[1]||'';
  assert(block.includes(serviceGuideLinks(id)),t.path+' '+id);
  count+=(block.match(/class="abaso-guide-link"/g)||[]).length;
 }
 assert.equal(count,6);report.townGuideLinks+=count;
}
// Independent breadth-first traversal of actual HTML links, not the sitemap.
const routes=['/',...new Set(towns.map(t=>'/'+t.provinceSlug+'/')),...towns.map(t=>t.path),...extraRoutes];
const set=new Set(routes),links=new Map(routes.map(route=>[route,hrefs(htmlFor(route)).map(h=>new URL(h,base+route)).filter(u=>u.origin===base).map(u=>u.pathname).filter(p=>set.has(p))]));
const distance=new Map([['/',0]]),queue=['/'];
for(let i=0;i<queue.length;i++){const p=queue[i];for(const next of links.get(p)||[]){if(distance.has(next))continue;distance.set(next,distance.get(p)+1);queue.push(next);}}
for(const r of routes)assert(distance.has(r)&&distance.get(r)<=2,'Ruta huérfana o lejana '+r);
report.indexableRouteCount=routes.length;assert.equal(routes.length,1641);report.maxDepth=Math.max(...distance.values());report.ok=true;
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/service-guides-build.json',JSON.stringify(report,null,2));
console.log('GUÍAS ABASO OK:',JSON.stringify(report));
