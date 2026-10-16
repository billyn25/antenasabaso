import test from 'node:test';
import assert from 'node:assert/strict';
import {guides,extraRoutes,serviceGuideLinks,enhanceHome,guideRoute,GUIDE_CSS_PATH} from '../scripts/service-guides.mjs';
const fixture='<html><head></head><body><main>'+['tdt','parabolicas','tdt-satelite','amplificacion','porteros','videoporteros','cobertura-movil','electricidad'].map(id=>`<article class="service-card" id="servicio-${id}"><h3>${id}</h3><p>Texto conservado</p></article>`).join('')+'</main><footer>Original</footer></body></html>';
test('six distinct guides and index; compatible routes and editorial metadata',()=>{
 assert.equal(guides.length,6);assert.equal(new Set(extraRoutes).size,7);
 const text=new Set();
 for(const g of guides){assert(g.title.includes('670 042 626'));assert(g.title.length<=70);assert(g.description.length>=105&&g.description.length<=180);assert(g.description.includes('670 042 626'));assert(g.intake.length===3&&g.faq.length===3);assert(g.sections.length>=3);for(const p of g.sections.flatMap(s=>s.paragraphs)){assert(!text.has(p),'No duplicated paragraphs');text.add(p);}for(const slug of g.related)assert(guides.some(x=>x.slug===slug)&&slug!==g.slug);for(const [name,url] of g.sources){assert(name);assert.equal(new URL(url).protocol,'https:');}assert(extraRoutes.includes(guideRoute(g)));}
});
test('home links add resources without removing original content or changing contacts',()=>{
 const h=enhanceHome(fixture);assert.equal((h.match(/class="abaso-guide-link"/g)||[]).length,6);
 const stripped=h.replace(/<a class="abaso-guide-link"[^>]*>[\s\S]*?<\/a>/g,'').replace(`<link rel="stylesheet" href="${GUIDE_CSS_PATH}">`,'');assert.equal(stripped,fixture);
 assert.equal(serviceGuideLinks('electricidad'),'');assert.equal(serviceGuideLinks('inventado'),'');
 assert.throws(()=>enhanceHome(fixture.replace('id="servicio-porteros"','id="otro"')));
});
