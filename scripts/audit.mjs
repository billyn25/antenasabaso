import fs from 'node:fs';
import path from 'node:path';
import services from '../content/services.json' with { type: 'json' };
import { provinces, totalTowns } from '../content/municipios.mjs';
import { comarcaFor, townsInComarca, comarcaGroups } from '../content/comarcas.mjs';

const ROOT=path.resolve('dist');
const DOMAIN='https://www.antenasabaso.com';
const PHONE='670 042 626';
const PHRASE='Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';
const errors=[];
const buildInfo=JSON.parse(fs.readFileSync(path.join(ROOT,'build-manifest.json'),'utf8'));
const production=buildInfo.mode==='production';
const requested=process.argv.includes('--production')?'production':(process.env.SITE_MODE||'preview');
const expectedMode=['deploy-preview','branch-deploy'].includes(process.env.CONTEXT)?'preview':requested;
if(buildInfo.mode!==expectedMode) errors.push('Modo generado distinto del solicitado');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const htmlFiles=walk(ROOT).filter(f=>f.endsWith('.html'));
const htmlByFile=new Map(htmlFiles.map(f=>[path.relative(ROOT,f).split(path.sep).join('/'),fs.readFileSync(f,'utf8')]));
const manifestFile=path.join(ROOT,'local-pages-manifest.json');
if(!fs.existsSync(manifestFile)) errors.push('Falta local-pages-manifest.json');
const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):[];
const expectedCounts={bizkaia:113,gipuzkoa:88,alava:51};
const legalRoutes=new Set(['/aviso-legal/','/privacidad/','/cookies/']);
if(totalTowns!==252||manifest.length!==252) errors.push(`Inventario alterado: dataset=${totalTowns}, manifiesto=${manifest.length}`);
if(new Set(manifest.map(p=>p.path)).size!==manifest.length) errors.push('Manifiesto: rutas duplicadas');
for(const province of provinces){
  if(province.towns.length!==expectedCounts[province.slug]) errors.push(`${province.slug}: ${province.towns.length} municipios`);
  if(!htmlByFile.has(province.slug+'/index.html')) errors.push(`${province.slug}: falta página provincial`);
}
const comarcaTownSet=new Set();
for(const province of provinces){
  const groups=comarcaGroups[province.slug]||{};
  for(const towns of Object.values(groups)) for(const town of towns){
    const key=province.slug+'|'+town;
    if(comarcaTownSet.has(key)) errors.push(`Comarcas: municipio duplicado ${key}`);
    comarcaTownSet.add(key);
  }
  for(const town of province.towns) if(!comarcaFor(province.slug,town)) errors.push(`Comarcas: falta ${province.name} / ${town}`);
  if([...comarcaTownSet].filter(x=>x.startsWith(province.slug+'|')).length!==province.towns.length) errors.push(`Comarcas: cobertura incompleta en ${province.name}`);
}

const titles=new Set(), metas=new Set(), canonicals=new Set();
const metadata=[];
let checkedLinks=0, checkedCrumbs=0, serviceContacts=0;
const similarityDocs=[];
const stripText=html=>decode(String(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim().toLowerCase();
const shingles=(text,size=5)=>{const words=text.split(/\s+/).filter(Boolean);const set=new Set();for(let i=0;i<=words.length-size;i++) set.add(words.slice(i,i+size).join(' '));return set;};
const jaccard=(a,b)=>{let common=0;for(const x of a) if(b.has(x)) common++;const union=a.size+b.size-common;return union?common/union:0;};
function fileFor(url){
  const pathname=decodeURIComponent(url.pathname);
  return pathname.endsWith('/')?pathname.slice(1)+'index.html':pathname.slice(1);
}
for(const [rel,html] of htmlByFile){
  const route=rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');
  const current=new URL(route,DOMAIN);
  const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if(h1.length!==1) errors.push(`${rel}: debe existir exactamente un H1`);
  const expectedRobots=production && rel!=='404.html' ? (legalRoutes.has(route)?'noindex,follow':'index,follow') : 'noindex,nofollow';
  if(!html.includes(`<meta name="robots" content="${expectedRobots}">`)) errors.push(`${rel}: robots incorrecto para ${buildInfo.mode}`);
  for(const resource of [...html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:webp|png|ico|svg|css|js))[^" ]*"/g)]){
    if(!fs.existsSync(path.join(ROOT,resource[1].slice(1)))) errors.push(`${rel}: recurso ausente ${resource[1]}`);
  }
  if(/(?:src|url)=["']https?:|<iframe|googletagmanager|google-analytics|fbq\(/i.test(html)) errors.push(`${rel}: recurso o rastreo externo inesperado`);
  if(!html.includes('href="/favicon.svg"')) errors.push(`${rel}: falta favicon`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length) errors.push(`${rel}: identificadores duplicados`);
  if(/\+ pueblo|\[localidad\]|Servicio en tu pueblo|Pueblos próximos|Sin puntuaciones inventadas/i.test(html)) errors.push(`${rel}: texto artificial o nota interna`);
  if(rel!=='404.html'){
    const titleMatches=[...html.matchAll(/<title>(.*?)<\/title>/g)];
    const descMatches=[...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
    const canonMatches=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    const title=decode(titleMatches[0]?.[1]||'');
    const description=decode(descMatches[0]?.[1]||'');
    const canonical=decode(canonMatches[0]?.[1]||'');
    if(titleMatches.length!==1||descMatches.length!==1||canonMatches.length!==1) errors.push(`${rel}: title/description/canonical ausente o duplicado`);
    if(canonical!==current.href) errors.push(`${rel}: canonical no coincide con su URL: ${canonical}`);
    const isLegal=legalRoutes.has(route);
    if(!isLegal&&!title.includes(PHONE)) errors.push(`${rel}: title sin teléfono íntegro`);
    if(title.length>70) errors.push(`${rel}: revisar longitud editorial del title (${title.length})`);
    // Rango editorial del proyecto, no supuesto límite ni garantía de snippet de Google.
    if(description.length<105||description.length>180) errors.push(`${rel}: descripción fuera del rango editorial (${description.length})`);
    if(!isLegal&&(!description.includes(PHRASE)||!description.includes(PHONE))) errors.push(`${rel}: descripción sin frase o teléfono`);
    if(!isLegal&&description.indexOf(PHONE)>60) errors.push(`${rel}: teléfono demasiado tarde en la descripción`);
    for(const [set,value,label] of [[titles,title,'title'],[metas,description,'description'],[canonicals,canonical,'canonical']]){
      if(set.has(value)) errors.push(`${rel}: ${label} duplicado`);
      set.add(value);
    }
    for(const [prop,value] of [['og:title',title],['og:description',description],['og:url',canonical]]){
      const matches=[...html.matchAll(new RegExp(`<meta property="${prop}" content="([^"]*)"`,'g'))];
      if(matches.length!==1||decode(matches[0]?.[1]||'')!==value) errors.push(`${rel}: ${prop} inconsistente`);
    }
    if(!legalRoutes.has(route)&&!html.includes(PHRASE)) errors.push(`${rel}: falta frase principal`);
    const jsonScripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if(jsonScripts.length!==1) errors.push(`${rel}: datos estructurados ausentes o duplicados`);
    try{
      const data=JSON.parse(jsonScripts[0]?.[1]||'');
      const graph=data['@graph']||[data];
      const page=graph.find(n=>['WebPage','CollectionPage'].includes(n['@type']));
      if(!page||page.url!==canonical||page.description!==description) errors.push(`${rel}: WebPage/CollectionPage inconsistente`);
      if(/aggregateRating|reviewCount/.test(JSON.stringify(data))) errors.push(`${rel}: valoración estructurada no acreditada`);
      const crumb=graph.find(n=>n['@type']==='BreadcrumbList');
      if(rel!=='index.html'){
        if(!crumb) errors.push(`${rel}: faltan breadcrumbs estructurados`);
        else{
          const items=crumb.itemListElement;
          const expected=['/',...current.pathname.split('/').filter(Boolean).map((_,i,parts)=>'/'+parts.slice(0,i+1).join('/')+'/')];
          if(items.length!==expected.length||items.some((it,i)=>it.position!==i+1||it.item!==DOMAIN+expected[i])) errors.push(`${rel}: breadcrumbs no coinciden con la ruta`);
          for(const item of items){
            if(!html.includes(`href="${new URL(item.item).pathname}"`)&&item.item!==current.href) errors.push(`${rel}: breadcrumb no visible ${item.item}`);
          }
          checkedCrumbs++;
        }
      }
    }catch(error){errors.push(`${rel}: JSON-LD inválido: ${error.message}`);}
    metadata.push({path:route,title,description,titleLength:title.length,descriptionLength:description.length,canonical});
  }
  for(const m of html.matchAll(/href="([^"]+)"/g)){
    const href=decode(m[1]);
    if(!href.startsWith('/')&&!href.startsWith('#')) continue;
    const target=new URL(href,current);
    if(target.origin!==DOMAIN) continue;
    const targetFile=fileFor(target);
    if(!fs.existsSync(path.join(ROOT,targetFile))) errors.push(`${rel}: destino inexistente ${href}`);
    if(target.hash&&htmlByFile.has(targetFile)){
      const id=decodeURIComponent(target.hash.slice(1));
      if(!htmlByFile.get(targetFile).includes(`id="${id}"`)) errors.push(`${rel}: ancla inexistente ${href}`);
    }
    checkedLinks++;
  }
}

for(const page of manifest){
  const html=htmlByFile.get(page.provinceSlug+'/'+page.slug+'/index.html');
  if(!html){errors.push(`Falta ${page.path}`);continue;}
  const meta=metadata.find(m=>m.path===page.path);
  if(!meta?.title.includes(page.name)||!meta.description.startsWith(`${page.name}, ${page.province} · ${PHONE}.`)) errors.push(`${page.path}: metadatos sin localidad real`);
  if(!html.includes(`<h1>Antenista en ${page.name}, ${page.province}</h1>`)) errors.push(`${page.path}: H1 local incorrecto`);
  for(const service of services){
    if(!html.includes(`<h3>${service.name} en ${page.name}</h3>`)) errors.push(`${page.path}: falta servicio local ${service.name}`);
    const card=html.match(new RegExp(`<article[^>]+id="servicio-${service.id}"[^>]*>([\\s\\S]*?)<\\/article>`))?.[1]||'';
    const href=decode(card.match(/href="([^"]+)"/)?.[1]||'');
    try{
      const url=new URL(href);
      const message=url.searchParams.get('text')||'';
      if(url.hostname!=='wa.me'||url.pathname!=='/34670042626'||!message.includes(page.name)||!message.includes(service.name.toLowerCase())) errors.push(`${page.path}: consulta de ${service.id} sin contexto o contacto incorrecto`);
      serviceContacts++;
    }catch{errors.push(`${page.path}: falta consulta específica de ${service.id}`);}
  }
  if(!html.includes(`class="local-trust-strip"`)||!html.includes(`Experiencia</small><strong>20 años</strong>`)||!html.includes(`Ámbito</small><strong>${page.name}</strong>`)) errors.push(`${page.path}: falta franja local de confianza`);
  if(!html.includes(`Así planteamos una intervención en ${page.name}`)) errors.push(`${page.path}: falta proceso local`);
  const prepBlock=html.match(/<section class="local-prep">([\s\S]*?)<\/section>/)?.[1]||'';
  if(!prepBlock.includes(`Qué datos ayudan a preparar el aviso en ${page.name}`)) errors.push(`${page.path}: falta preparación local del aviso`);
  if([...prepBlock.matchAll(/<li>/g)].length!==5) errors.push(`${page.path}: preparación local debe tener 5 datos útiles`);
  const comarca=comarcaFor(page.provinceSlug,page.name);
  if(!html.includes(`<h2>${page.name} · ${comarca}</h2>`)||!html.includes(`pertenece a la comarca ${comarca}`)||!html.includes(`Territorio Histórico de ${page.province}`)) errors.push(`${page.path}: falta contexto territorial/comarca`);
  const relatedTitle=`Otros municipios de ${comarca}`;
  if(!html.includes(relatedTitle)) errors.push(`${page.path}: enlazado relacionado sin comarca`);
  const relatedBlock=html.match(/<div class="related-grid">([\s\S]*?)<\/div>/)?.[1]||'';
  const relatedLinks=[...relatedBlock.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(relatedLinks).size!==relatedLinks.length) errors.push(`${page.path}: enlaces de comarca repetidos`);
  for(const link of relatedLinks){
    const peer=manifest.find(x=>x.path===link);
    if(!peer||peer.path===page.path||peer.provinceSlug!==page.provinceSlug||comarcaFor(peer.provinceSlug,peer.name)!==comarca) errors.push(`${page.path}: enlace fuera de su comarca: ${link}`);
  }
  if(!html.includes(`Marcas que podemos revisar en ${page.name}`)) errors.push(`${page.path}: falta bloque local de marcas`);
  const intentBlock=html.match(/<section class="local-intents">([\s\S]*?)<\/section>/)?.[1]||'';
  const intentCards=[...intentBlock.matchAll(/<article>/g)].length;
  const faqBlock=html.match(/<section class="local-faq">([\s\S]*?)<\/section>/)?.[1]||'';
  const faqCount=[...faqBlock.matchAll(/<details>/g)].length;
  if(intentCards!==4) errors.push(`${page.path}: deben existir 4 casos locales útiles`);
  if(faqCount!==3) errors.push(`${page.path}: deben existir 3 preguntas frecuentes locales`);
  if(!intentBlock.includes(`Qué podemos revisar en ${page.name}`)||!faqBlock.includes(page.name)) errors.push(`${page.path}: bloque práctico/FAQ sin localidad real`);
  if(/<span class="brand-copy">[\s\S]*?<small>Euskadi<\/small>[\s\S]*?<\/span>/i.test(html)) errors.push(`${page.path}: logo con subtítulo retirado`);
  const bar=html.match(/<div class="mobile-bar">([\s\S]*?)<\/div>/)?.[1]||'';
  const barHref=decode(bar.match(/href="(https:\/\/wa\.me[^"]+)"/)?.[1]||'');
  if(!barHref||!new URL(barHref).searchParams.get('text')?.includes(page.name)) errors.push(`${page.path}: WhatsApp móvil pierde localidad`);
  const mainBlock=html.match(/<main class="local-page"[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
  let normalized=stripText(mainBlock);
  for(const value of [page.name,page.province,comarca,PHONE]) normalized=normalized.replaceAll(String(value).toLowerCase(),'{local}');
  normalized=normalized.replace(/\b\d+[a-z]?\b/g,'#');
  similarityDocs.push({path:page.path,set:shingles(normalized)});
}
// Indicador interno de coincidencia textual. No certifica originalidad ni evita penalizaciones de Google.
let highestSimilarity={score:0,a:'',b:''};
for(let i=0;i<similarityDocs.length;i++) for(let j=i+1;j<similarityDocs.length;j++){
  const score=jaccard(similarityDocs[i].set,similarityDocs[j].set);
  if(score>highestSimilarity.score) highestSimilarity={score,a:similarityDocs[i].path,b:similarityDocs[j].path};
  if(score>=0.92) errors.push(`Páginas locales demasiado parecidas (${score.toFixed(3)}): ${similarityDocs[i].path} y ${similarityDocs[j].path}`);
}
for(const province of provinces){
  const html=htmlByFile.get(province.slug+'/index.html')||'';
  if(!html.includes('class="alpha-nav"')||!html.includes('class="alpha-group"')) errors.push(`${province.slug}: falta abecedario`);
  for(const town of province.towns){
    const item=manifest.find(x=>x.name===town&&x.provinceSlug===province.slug);
    if(!item||!html.includes(`href="${item.path}"`)) errors.push(`${province.slug}: falta enlace a ${town}`);
  }
}

for(const route of legalRoutes){
  const rel=route.slice(1)+'index.html';
  const html=htmlByFile.get(rel)||'';
  if(!html) errors.push(`Legal: falta ${route}`);
  if(!html.includes('class="legal-page"')) errors.push(`Legal: diseño legal ausente en ${route}`);
  if(!html.includes('href="/aviso-legal/"')||!html.includes('href="/privacidad/"')||!html.includes('href="/cookies/"')) errors.push(`Legal: navegación incompleta en ${route}`);
}
const home=htmlByFile.get('index.html')||'';
if(/<style\b/i.test(home)) errors.push('Portada: quedan estilos inline; deben vivir en styles.css');
if(/<script\s+src="\/script\.js"/i.test(home)) errors.push('Portada: queda JS de scroll redundante');

if(/SERVICIO \+ PUEBLO|\+ pueblo|Antenista en pueblos|Busca tu pueblo/i.test(home)) errors.push('Portada: texto SEO artificial');
for(const province of provinces) if(!home.includes(`href="/${province.slug}/"`)) errors.push(`Portada: falta ${province.slug}`);
for(const target of ['#servicio-tdt','#servicio-parabolicas','#servicio-porteros','#servicio-cobertura-movil','#servicio-electricidad']){
  if(!home.includes(`href="${target}"`)) errors.push(`Hero: falta acceso ${target}`);
}
const featuredBlocks=[...home.matchAll(/<article class="town-province" data-province="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
if(featuredBlocks.length!==provinces.length) errors.push('Portada: faltan provincias destacadas');
const featuredProvinces=new Set();
let featuredCount=0;
for(const [,slug,block] of featuredBlocks){
  const province=provinces.find(p=>p.slug===slug);
  if(!province||featuredProvinces.has(slug)){errors.push(`Portada: provincia desconocida o duplicada ${slug}`);continue;}
  featuredProvinces.add(slug);
  const list=block.match(/<ul class="town-quick-links"[^>]*>([\s\S]*?)<\/ul>/)?.[1]||'';
  const links=[...list.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  if(links.length!==10||new Set(links).size!==10) errors.push(`Portada ${slug}: deben existir diez localidades distintas`);
  for(const href of links) if(!manifest.some(p=>p.path===href&&p.provinceSlug===slug)) errors.push(`Portada ${slug}: destino inválido ${href}`);
  if(!block.includes(`class="town-all" href="/${slug}/"`)||!block.includes(`Ver los ${province.towns.length} municipios`)) errors.push(`Portada ${slug}: listado completo incoherente`);
  if(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<a\b/i.test(block)) errors.push(`Portada ${slug}: enlaces anidados`);
  featuredCount+=links.length;
}

const brandSections=[...home.matchAll(/<section class="abaso-brands" id="marcas"[^>]*>([\s\S]*?)<\/section>/g)];
if(brandSections.length!==1) errors.push('Portada: sección de marcas ausente o duplicada');
const brandSection=brandSections[0]?.[1]||'';
const expectedBrands={antenas:['Televés','Alcad','Ikusi','Fagor','Rover','EK','FTE Maximal','Fringe'],porteros:['Fermax','Tegui','Golmar','Comelit','Bticino','Legrand','Fringe','Galak']};
const brandFamilies=[...brandSection.matchAll(/<article class="abaso-brand-family" data-brand-family="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
if(brandFamilies.length!==2) errors.push('Marcas: faltan familias');
const foundFamilies=new Set();
for(const [,family,block] of brandFamilies){
  if(!expectedBrands[family]||foundFamilies.has(family)){errors.push(`Marcas: familia incorrecta ${family}`);continue;}
  foundFamilies.add(family);
  const list=[...block.matchAll(/<li>([^<]+)<\/li>/g)].map(m=>m[1].trim());
  if(list.length!==expectedBrands[family].length||new Set(list).size!==list.length) errors.push(`Marcas ${family}: cantidades incorrectas`);
  for(const brand of expectedBrands[family]) if(!list.includes(brand)) errors.push(`Marcas ${family}: falta ${brand}`);
}
if(!brandSection.includes('Porteros automáticos y videoporteros')) errors.push('Marcas: denominación de porteros incompleta');
if(/<a\b|<button\b|<img\b|servicio (?:t[eé]cnico )?oficial|distribuidor oficial|partner oficial|aggregateRating|reviewCount/i.test(brandSection)) errors.push('Marcas: enlaces o afiliación no autorizada');
if(home.indexOf('id="marcas"')<home.indexOf('id="servicios"')) errors.push('Marcas antes de servicios');
for(const title of ['Instalación y reparación de antenas','Porteros automáticos','Reparaciones eléctricas en viviendas','Pide presupuesto sin compromiso']) if(!home.includes(title)) errors.push(`Portada: falta contenido ${title}`);
if(!home.includes('class="review-stars"')||!home.includes('★★★★★')) errors.push('Portada: se han perdido las estrellas de confianza');
for(const href of ['/aviso-legal/','/privacidad/','/cookies/']) if(!home.includes(`href="${href}"`)) errors.push(`Portada: falta enlace legal ${href}`);
if(!home.includes('data-cookie-notice')||!home.includes('data-cookie-dismiss')) errors.push('Portada: falta aviso informativo de cookies');
if(!home.includes('property="og:image"')||!home.includes('name="twitter:card"')) errors.push('Portada: faltan metadatos sociales de cierre');
if(!home.includes('<b>20</b> Años de experiencia')||!home.includes('20 años de experiencia')) errors.push('Portada: falta experiencia acreditada en la web anterior');
const gallery=home.match(/<section class="service-gallery"[\s\S]*?<\/section>/)?.[0]||'';
const galleryFigures=[...gallery.matchAll(/<figure class="gallery-item/g)].length;
const galleryImages=[...gallery.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
if(galleryFigures!==6||galleryImages.length!==6) errors.push('Galería: deben existir 6 imágenes de servicio');
if(galleryImages.some(img=>! /loading="lazy"/.test(img)||! /alt="[^"]+"/.test(img))) errors.push('Galería: imágenes sin lazy loading o alt descriptivo');
for(const asset of ['parabolica-realista.webp','cobertura-4g5g-realista.webp','amplificacion-distribucion.webp']){
  if(!fs.existsSync(path.join(ROOT,'assets','gallery',asset))) errors.push(`Galería: falta recurso local ${asset}`);
}
for(const label of ['Antenas TDT','Parabólicas','Porteros y videoporteros','Cobertura móvil 4G/5G','Amplificación y distribución','Reparaciones eléctricas']){
  if(!gallery.includes(`<strong>${label}</strong>`)) errors.push(`Galería: falta bloque ${label}`);
}

const sourceCss=fs.readFileSync(path.resolve('styles.css'),'utf8');
for(const stale of ['hero-phone-focus','local-seo-','province-strip','province-grid','brand-roof','brand-antenna','brand-wave','btn-secondary','btn-outline-light']){
  if(sourceCss.includes(stale)) errors.push(`CSS: queda selector huérfano ${stale}`);
}
const faviconFile=path.join(ROOT,'favicon.svg');
if(!fs.existsSync(faviconFile)) errors.push('Falta favicon.svg');
else{
  const favicon=fs.readFileSync(faviconFile,'utf8');
  if(!favicon.includes('viewBox="0 0 128 128"')||!favicon.includes('<title>Antenas Abaso</title>')) errors.push('Favicon no cuadrado o sin identidad');
  const geometry=[...home.match(/<svg\b[^>]*data-logo="parabolica"[^>]*>[\s\S]*?<\/svg>/)?.[0]?.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)||[]].map(m=>m[1]);
  if(!geometry.length||geometry.some(d=>!favicon.includes(`d="${d}"`))) errors.push('Favicon no procede del logo aprobado');
}
const robots=fs.readFileSync(path.join(ROOT,'robots.txt'),'utf8');
const headers=fs.readFileSync(path.join(ROOT,'_headers'),'utf8');
if(!/^Allow:\s*\/$/mi.test(robots)||/^Disallow:\s*\/$/mi.test(robots)) errors.push('robots.txt impide rastrear las instrucciones');
if(production){
  if(/X-Robots-Tag:\s*noindex/i.test(headers)) errors.push('Producción conserva noindex global');
  if(fs.existsSync(path.join(ROOT,'preview-manifest.json'))) errors.push('Manifiesto preview en producción');
  const xml=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
  const expected=metadata.filter(m=>!legalRoutes.has(m.path)).map(m=>m.canonical);
  if(urls.length!==256||new Set(urls).size!==urls.length||urls.some(u=>!expected.includes(u))||expected.some(u=>!urls.includes(u))) errors.push('Sitemap no coincide con las 256 URLs indexables');
  if(!robots.includes(`Sitemap: ${DOMAIN}/sitemap.xml`)) errors.push('robots.txt no declara sitemap');
  const redirects=fs.readFileSync(path.join(ROOT,'_redirects'),'utf8');
  if(!redirects.includes('/index.html / 301!')||/\/\*\s+\/index\.html\s+200/.test(redirects)) errors.push('Redirecciones incorrectas');
}else{
  if(!/X-Robots-Tag:\s*noindex, nofollow/i.test(headers)) errors.push('Preview sin noindex HTTP');
  if(fs.existsSync(path.join(ROOT,'sitemap.xml'))||fs.existsSync(path.join(ROOT,'_redirects'))) errors.push('Preview con configuración de producción');
}
const assetSources=JSON.parse(fs.readFileSync('assets/gallery/sources.json','utf8'));
for(const item of assetSources){
  if(!fs.existsSync(path.join(ROOT,item.file.slice(1)))) errors.push(`Falta imagen original local: ${item.file}`);
  if(!home.includes(item.file)) errors.push(`La portada no utiliza la imagen local: ${item.file}`);
}
if(/https?:\/\/www\.antenasabaso\.com\/img\//.test(home+sourceCss)) errors.push('Quedan imágenes dependientes de la web antigua');
for(const alias of ['Home','Antenas','videoportero','electricidad','formulario']) if(!home.includes(`id="${alias}"`)) errors.push(`Falta ancla histórica ${alias}`);
if(htmlFiles.length!==260) errors.push(`HTML=${htmlFiles.length}; esperados 260`);
const siteJsFile=path.join(ROOT,'site.js');
if(!fs.existsSync(siteJsFile)) errors.push('Falta site.js');
else{
  const js=fs.readFileSync(siteJsFile,'utf8');
  if(!js.includes('antenas-abaso-cookie-info-v1')||!js.includes('data-cookie-dismiss')) errors.push('site.js: gestión del aviso de cookies incompleta');
}

if(errors.length){
  console.error(`AUDITORÍA ABASO FALLIDA (${errors.length})`);
  for(const error of errors.slice(0,200)) console.error('- '+error);
  process.exit(1);
}
const lengths=metadata.map(m=>m.descriptionLength);
console.log(`AUDITORÍA ABASO OK: ${manifest.length} páginas locales + 3 páginas legales, ${canonicals.size} canonicals y metas únicos, descripciones de ${Math.min(...lengths)}-${Math.max(...lengths)} caracteres, ${checkedCrumbs} breadcrumbs, ${checkedLinks} enlaces/anclas válidos, ${serviceContacts} consultas por servicio/localidad y ${featuredCount} accesos de portada. Similitud local máxima ${highestSimilarity.score.toFixed(3)} (${highestSimilarity.a} / ${highestSimilarity.b}). Modo ${buildInfo.mode}; recursos locales, comarca, robots, sitemap según modo, cookies informativas, galería y favicon comprobados. Datos fiscales del titular incompletos; revisión editorial SEO pendiente.`);
