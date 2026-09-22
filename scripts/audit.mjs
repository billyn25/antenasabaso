import fs from 'node:fs';
import path from 'node:path';
import services from '../content/services.json' with { type: 'json' };
import { provinces, totalTowns } from '../content/municipios.mjs';

const ROOT=path.resolve('dist');
const DOMAIN='https://www.antenasabaso.com';
const PHONE='670 042 626';
const PHRASE='Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';
const errors=[];

const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const htmlFiles=walk(ROOT).filter(f=>f.endsWith('.html'));
const manifestFile=path.join(ROOT,'local-pages-manifest.json');
if(!fs.existsSync(manifestFile)) errors.push('Falta local-pages-manifest.json');
const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):[];

if(totalTowns!==252) errors.push(`Dataset incorrecto: ${totalTowns} municipios`);
if(manifest.length!==252) errors.push(`Manifest incorrecto: ${manifest.length} páginas locales`);
const expectedCounts={bizkaia:113,gipuzkoa:88,alava:51};
for(const province of provinces){
  if(province.towns.length!==expectedCounts[province.slug]) errors.push(`${province.slug}: ${province.towns.length} municipios`);
  if(!fs.existsSync(path.join(ROOT,province.slug,'index.html'))) errors.push(`${province.slug}: falta página provincial`);
}

const canonicalSet=new Set();
const titleSet=new Set();
for(const page of manifest){
  const file=path.join(ROOT,page.provinceSlug,page.slug,'index.html');
  if(!fs.existsSync(file)){errors.push(`Falta ${page.path}`);continue}
  const html=fs.readFileSync(file,'utf8');
  const title=html.match(/<title>(.*?)<\/title>/i)?.[1]||'';
  const meta=html.match(/<meta name="description" content="([^"]*)">/i)?.[1]||'';
  const canonical=html.match(/<link rel="canonical" href="([^"]+)">/i)?.[1]||'';
  if(!title.includes(page.name)||!title.includes(PHONE)) errors.push(`${page.path}: title sin pueblo/teléfono`);
  if(title.length>70) errors.push(`${page.path}: title largo (${title.length})`);
  if(titleSet.has(title)) errors.push(`${page.path}: title duplicado`); else titleSet.add(title);
  if(!meta.includes(PHRASE)||!meta.includes(page.name)||!meta.includes(PHONE)) errors.push(`${page.path}: meta incompleta`);
  if(!html.includes(`<h1>Antenista en ${page.name}, ${page.province}</h1>`)) errors.push(`${page.path}: H1 local incorrecto`);
  if(!html.includes(PHRASE)) errors.push(`${page.path}: falta frase principal`);
  if(!html.includes(PHONE)) errors.push(`${page.path}: falta teléfono`);
  for(const service of services) if(!html.includes(service.name)) errors.push(`${page.path}: falta servicio ${service.name}`);
  if(!/<meta name="robots" content="noindex,nofollow">/i.test(html)) errors.push(`${page.path}: preview indexable`);
  const expected=`${DOMAIN}${page.path}`;
  if(canonical!==expected) errors.push(`${page.path}: canonical ${canonical}`);
  if(canonicalSet.has(canonical)) errors.push(`${page.path}: canonical duplicado`); else canonicalSet.add(canonical);
  if(!html.includes(`href="/${page.provinceSlug}/"`)) errors.push(`${page.path}: falta enlace provincial`);
}

for(const province of provinces){
  const file=path.join(ROOT,province.slug,'index.html');
  if(!fs.existsSync(file)) continue;
  const html=fs.readFileSync(file,'utf8');
  for(const town of province.towns){
    const item=manifest.find(x=>x.name===town&&x.provinceSlug===province.slug);
    if(!item||!html.includes(`href="${item.path}"`)) errors.push(`/${province.slug}/: falta enlace a ${town}`);
  }
}

const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
for(const province of provinces) if(!home.includes(`href="/${province.slug}/"`)) errors.push(`Portada: falta /${province.slug}/`);
if(/SERVICIO \+ PUEBLO|\+ pueblo/i.test(home)) errors.push('Portada: queda texto SEO artificial');
if(!home.includes(PHRASE)) errors.push('Portada: falta frase principal');
if(!home.includes('Antenas para cobertura móvil')) errors.push('Portada: falta cobertura móvil');
if(!home.includes('Porteros automáticos')) errors.push('Portada: falta porteros automáticos');

// Los accesos de portada deben abrir páginas locales reales, sin enlaces anidados.
const featuredBlocks=[...home.matchAll(/<article class="town-province" data-province="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
if(featuredBlocks.length!==provinces.length) errors.push('Portada: faltan bloques de pueblos destacados');
const featuredProvinces=new Set();
let featuredCount=0;
for(const [,slug,block] of featuredBlocks){
  const province=provinces.find(p=>p.slug===slug);
  if(!province||featuredProvinces.has(slug)){
    errors.push(`Portada: provincia desconocida o duplicada ${slug}`);
    continue;
  }
  featuredProvinces.add(slug);
  const list=block.match(/<ul class="town-quick-links"[^>]*>([\s\S]*?)<\/ul>/)?.[1]||'';
  const links=[...list.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  if(links.length!==6||new Set(links).size!==6) errors.push(`Portada ${slug}: deben existir seis pueblos distintos`);
  for(const href of links){
    const town=manifest.find(p=>p.path===href&&p.provinceSlug===slug);
    if(!town||!fs.existsSync(path.join(ROOT,town.provinceSlug,town.slug,'index.html'))) errors.push(`Portada ${slug}: destino local inválido ${href}`);
  }
  if(!block.includes(`class="town-all" href="/${slug}/"`)) errors.push(`Portada ${slug}: falta acceso al listado completo`);
  if(!block.includes(`Ver los ${province.towns.length} municipios`)) errors.push(`Portada ${slug}: contador del listado completo incorrecto`);
  if(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<a\b/i.test(block)) errors.push(`Portada ${slug}: enlaces anidados`);
  featuredCount+=links.length;
}
for(const province of provinces) if(!featuredProvinces.has(province.slug)) errors.push(`Portada: faltan pueblos destacados de ${province.name}`);

const robots=fs.readFileSync(path.join(ROOT,'robots.txt'),'utf8');
if(!/^Disallow:\s*\/$/mi.test(robots)) errors.push('Preview: robots no bloquea /');
const headers=fs.readFileSync(path.join(ROOT,'_headers'),'utf8');
if(!/X-Robots-Tag:\s*noindex, nofollow/i.test(headers)) errors.push('Preview: falta X-Robots-Tag noindex');

if(htmlFiles.length!==257) errors.push(`HTML=${htmlFiles.length}; esperados 257 (252 pueblos + 3 provincias + portada + 404)`);

if(errors.length){
  console.error(`AUDITORÍA ABASO FALLIDA (${errors.length})`);
  for(const error of errors.slice(0,200)) console.error('- '+error);
  process.exit(1);
}
console.log(`AUDITORÍA ABASO OK: 252 pueblos (113 Bizkaia + 88 Gipuzkoa + 51 Álava), 7 servicios, teléfono y SEO local presentes; ${featuredCount} accesos directos de portada válidos; preview completamente noindex.`);
