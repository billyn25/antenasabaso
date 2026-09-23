import fs from 'node:fs';
import path from 'node:path';
import services from '../content/services.json' with { type: 'json' };
import { provinces, totalTowns } from '../content/municipios.mjs';

const ROOT = path.resolve('dist');
const DOMAIN = 'https://www.antenasabaso.com';
const PHONE = '670 042 626';
const TEL = '+34670042626';
const WA = '34670042626';
const PHRASE = 'Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';

// Una sola fuente del logo: las páginas provinciales y locales reutilizan el SVG de portada.
const homeSource = fs.readFileSync(path.resolve('index.html'), 'utf8');
const brandSvg = homeSource.match(/<svg\b[^>]*data-logo="parabolica"[^>]*>[\s\S]*?<\/svg>/)?.[0];
if (!brandSvg) throw new Error('Falta el SVG de la parabólica de Antenas Abaso en la portada');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = value => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const hash = value => { let h=2166136261; for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;} return h>>>0; };
const canonical = route => new URL(route, DOMAIN).href;
const tel = () => 'tel:' + TEL;
const wa = text => 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);

const introVariants = [
  (t,p)=>`En ${t}, ${p}, atendemos instalaciones y averías de antena, porteros automáticos, videoporteros y cobertura móvil. Antes de sustituir equipos se revisa el origen del problema y el estado de la instalación.`,
  (t,p)=>`Si necesitas servicio técnico en ${t}, indica si se trata de una vivienda, comunidad o pequeño negocio y qué síntoma presenta la instalación. Trabajamos antenas, porteros automáticos, videoporteros y señal móvil en ${p}.`,
  (t,p)=>`El servicio en ${t} incluye reparación e instalación de TDT, parabólicas, amplificación, porteros automáticos, videoporteros y antenas para cobertura móvil 4G/5G. La intervención se concreta según la instalación existente.`,
  (t,p)=>`Antenas Abaso organiza la atención en ${t}, ${p}, por tipo de avería y equipo. Una pérdida de señal, un fallo de portero o una cobertura móvil deficiente requieren comprobaciones distintas antes de decidir la solución.`
];
const adviceVariants = [
  t=>`Para preparar un aviso en ${t}, indica si el problema afecta a una sola toma o a varias. En porteros automáticos, ayuda saber si falla la llamada, el audio, la imagen o la apertura.`,
  t=>`Si el problema está en ${t}, cuéntanos desde cuándo ocurre y qué equipos están afectados. Una foto del equipo visible puede ayudar a preparar la revisión sin desmontar nada.`,
  t=>`Para una instalación nueva en ${t}, indica cuántos puntos necesitas y si ya existe antena, cableado, portero o instalación comunitaria.`,
  t=>`En trabajos de cobertura móvil en ${t}, indica operador y si el problema afecta a llamadas, datos o ambos. La solución depende de la señal disponible en la vivienda.`
];
const focusVariants = [
  t=>`Reparación de antenas y señal TDT en ${t}`,
  t=>`Porteros automáticos y videoporteros en ${t}`,
  t=>`Antenas para cobertura móvil 4G/5G en ${t}`,
  t=>`Instalación y mantenimiento técnico en ${t}`
];

function fitTitle(town, province){
  const candidates = [
    `Antenista en ${town}, ${province} | ${PHONE}`,
    `Antenas en ${town}, ${province} | ${PHONE}`,
    `Antenista ${town} | ${PHONE}`
  ];
  return candidates.find(x=>x.length<=70) || candidates[2].slice(0,70);
}
function metaDescription(town, province){
  return `${PHRASE} en ${town}, ${province}. TDT, parabólicas, cobertura móvil 4G/5G y reparaciones eléctricas. ${PHONE}.`;
}
function brand(){
  return `<a class="brand" href="/" aria-label="Antenas Abaso, inicio"><span class="brand-mark brand-mark-abaso" aria-hidden="true">${brandSvg}</span><span class="brand-copy"><b>ANTENAS</b><strong>ABASO</strong></span></a>`;
}
function header(){
  return `<div class="topbar"><div class="wrap topbar-inner"><span>Instalador autorizado nº 11024</span><div><strong>Urgencias 24h</strong><span class="dot">·</span><a href="${tel()}">${PHONE}</a></div></div></div><header class="site-header"><div class="wrap header-inner">${brand()}<nav class="main-nav" aria-label="Navegación principal"><a href="/#servicios">Servicios</a><a href="/#euskadi">Municipios</a><a href="/#confianza">Confianza</a><a href="#contacto">Contacto</a></nav><a class="header-phone" href="${tel()}"><small>Llámanos ahora</small><strong>${PHONE}</strong></a></div></header>`;
}
function footer(){
  return `<footer class="footer"><div class="wrap footer-grid"><div><strong>Antenas Abaso</strong><p>${PHRASE}. Servicio en municipios de Bizkaia, Gipuzkoa y Álava. Tel. <a href="${tel()}">${PHONE}</a>.</p></div><div><strong>Contacto</strong><p><a href="${tel()}">${PHONE}</a><br><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></p></div><div><strong>Cobertura</strong><p><a href="/bizkaia/">Bizkaia</a> · <a href="/gipuzkoa/">Gipuzkoa</a> · <a href="/alava/">Álava</a></p></div></div><div class="wrap footer-bottom"><span>© Antenas Abaso</span><span>Instalador autorizado nº 11024</span></div></footer><div class="mobile-bar"><a href="${tel()}">Llamar</a><a href="${wa('Hola, necesito consultar un servicio con Antenas Abaso.')}">WhatsApp</a></div>`;
}
function head(title,description,route,structured){
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${esc(canonical(route))}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical(route))}"><meta property="og:site_name" content="Antenas Abaso"><meta name="theme-color" content="#18324a"><link rel="stylesheet" href="/styles.css"><script src="/script.js" defer></script><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head>`;
}
function serviceCards(town=''){
  return services.map((s,i)=>`<article class="service-card${i===0?' featured':''}" id="servicio-${s.id}"><span class="num">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.name)}${town?' en '+esc(town):''}</h3><p>${esc(s.text)}</p></article>`).join('');
}

function localGuide(town){
  const items=[
    ['Televisión y antena',`Si en ${town} faltan canales, la imagen se pixela o una toma ha dejado de funcionar, conviene comprobar si el fallo afecta a un solo televisor o a varios antes de cambiar antena o amplificador.`],
    ['Portero automático o videoportero',`En ${town}, indica si falla la llamada, el audio, la imagen o la apertura. La marca y el modelo visibles ayudan a comprobar compatibilidad antes de sustituir telefonillo, monitor o placa.`],
    ['Cobertura móvil 4G/5G',`Para una vivienda de ${town} con poca señal móvil, indica operador, router y si el problema afecta a llamadas, datos o ambos. La antena exterior y su ubicación dependen de la señal disponible.`]
  ];
  return `<section class="local-guide"><div class="wrap"><span class="eyebrow">Antes de organizar la visita</span><h2>Qué podemos comprobar en ${esc(town)}</h2><div class="local-guide-grid">${items.map(([title,text])=>`<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div></div></section>`;
}

function localStructured(title,description,route,town,province){
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':DOMAIN+'/#website',name:'Antenas Abaso',url:DOMAIN+'/'},
    {'@type':'WebPage','@id':canonical(route)+'#page',name:title,url:canonical(route),description,isPartOf:{'@id':DOMAIN+'/#website'}},
    {'@type':'Service','@id':canonical(route)+'#service',name:`Servicio técnico de antenas en ${town}`,description:PHRASE,areaServed:{'@type':'AdministrativeArea',name:`${town}, ${province}`},provider:{'@type':'ProfessionalService',name:'Antenas Abaso',telephone:TEL,url:DOMAIN+'/'}}
  ]};
}
function renderTown(province,town,index){
  const townSlug=slugify(town);
  const route=`/${province.slug}/${townSlug}/`;
  const title=fitTitle(town,province.name);
  const description=metaDescription(town,province.name);
  const h=hash(`${province.slug}|${town}`);
  const peers=province.towns.filter(x=>x!==town);
  const related=Array.from({length:6},(_,i)=>peers[(h+i*17)%peers.length]);
  return `${head(title,description,route,localStructured(title,description,route,town,province.name))}<body>${header()}<main class="local-page"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><a href="/${province.slug}/">${esc(province.name)}</a><span>/</span><span>${esc(town)}</span></nav><section class="local-hero"><div class="wrap local-hero-grid"><div><span class="eyebrow">Servicio técnico en ${esc(town)}</span><h1>Antenista en ${esc(town)}, ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p class="local-lead">${esc(introVariants[h%introVariants.length](town,province.name))}</p><div class="hero-actions"><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a><a class="btn btn-whatsapp" href="${wa(`Hola, necesito un servicio en ${town}.`)}">WhatsApp</a></div></div><aside class="local-contact"><small>Consulta directa</small><strong>${PHONE}</strong><p>Indica ${esc(town)} y qué problema presenta la instalación.</p><a href="${tel()}">Llamar ahora →</a></aside></div></section><section class="section services"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Servicios en ${esc(town)}</span><h2>${esc(focusVariants[(h>>>3)%focusVariants.length](town))}</h2></div><p>${esc(adviceVariants[(h>>>7)%adviceVariants.length](town))}</p></div><div class="service-grid">${serviceCards(town)}</div></div></section>${localGuide(town)}<section class="local-related"><div class="wrap"><span class="eyebrow">Más localidades</span><h2>Otros municipios de ${esc(province.name)}</h2><div class="related-grid">${related.map(x=>`<a href="/${province.slug}/${slugify(x)}/">${esc(x)} →</a>`).join('')}</div><a class="province-back" href="/${province.slug}/">Ver los ${province.towns.length} municipios de ${esc(province.name)} →</a></div></section><section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>Servicio en ${esc(town)}</h2><p>Cuéntanos el tipo de instalación y qué ocurre. Te atendemos por teléfono o WhatsApp.</p></div><div class="contact-actions"><a class="btn btn-light" href="${tel()}">${PHONE}</a><a class="btn btn-whatsapp-light" href="${wa(`Hola, necesito un servicio en ${town}.`)}">WhatsApp</a></div></div></section></main>${footer()}</body></html>`;
}
function renderProvince(province){
  const route=`/${province.slug}/`;
  const title=`Antenistas en ${province.name} | ${PHONE}`;
  const description=`${PHRASE} en ${province.name}. TDT, parabólicas, cobertura móvil 4G/5G y electricidad. ${PHONE}.`;
  const sorted=[...province.towns].sort((a,b)=>a.localeCompare(b,'es'));
  const groups=new Map();
  for(const town of sorted){
    const first=town.normalize('NFD').replace(/[\u0300-\u036f]/g,'').charAt(0).toUpperCase();
    if(!groups.has(first)) groups.set(first,[]);
    groups.get(first).push(town);
  }
  const letters=[...groups.keys()];
  const alphabet=`<nav class="alpha-nav" aria-label="Índice alfabético">${letters.map(letter=>`<a href="#letra-${letter}">${letter}</a>`).join('')}</nav>`;
  const grouped=`${[...groups].map(([letter,towns])=>`<section class="alpha-group" id="letra-${letter}"><h3>${letter}</h3><div class="town-directory-grid">${towns.map(t=>`<a href="/${province.slug}/${slugify(t)}/">${esc(t)} <span>→</span></a>`).join('')}</div></section>`).join('')}`;
  return `${head(title,description,route,{'@context':'https://schema.org','@type':'CollectionPage',name:title,url:canonical(route),description})}<body>${header()}<main class="local-page"><nav class="wrap breadcrumb"><a href="/">Inicio</a><span>/</span><span>${esc(province.name)}</span></nav><section class="province-hero"><div class="wrap"><span class="eyebrow">Servicio por municipios</span><h1>Antenistas en ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p>Selecciona tu municipio para consultar antenas TDT, parabólicas, amplificación, porteros automáticos, videoporteros, cobertura móvil 4G/5G y reparaciones eléctricas.</p><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a></div></section><section class="town-directory"><div class="wrap"><div class="directory-head"><div><span class="eyebrow">Todos los municipios</span><h2>${province.towns.length} municipios de ${esc(province.name)}</h2></div><p>Una página local por municipio, con servicios y contacto directo.</p></div>${alphabet}${grouped}</div></section><section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>¿No encuentras tu pueblo?</h2><p>Llámanos e indica tu localidad de ${esc(province.name)}.</p></div><div class="contact-actions"><a class="btn btn-light" href="${tel()}">${PHONE}</a><a class="btn btn-whatsapp-light" href="${wa(`Hola, necesito un servicio en ${province.name}.`)}">WhatsApp</a></div></div></section></main>${footer()}</body></html>`;
}

fs.rmSync(ROOT,{recursive:true,force:true});
fs.mkdirSync(ROOT,{recursive:true});
for(const file of ['styles.css','script.js']) fs.copyFileSync(path.resolve(file),path.join(ROOT,file));

let home=homeSource;
home=home.replaceAll('href="#bizkaia"','href="/bizkaia/"').replaceAll('href="#gipuzkoa"','href="/gipuzkoa/"').replaceAll('href="#alava"','href="/alava/"');
fs.writeFileSync(path.join(ROOT,'index.html'),home);

const manifest=[];
for(const province of provinces){
  const provinceDir=path.join(ROOT,province.slug);
  fs.mkdirSync(provinceDir,{recursive:true});
  fs.writeFileSync(path.join(provinceDir,'index.html'),renderProvince(province));
  for(let i=0;i<province.towns.length;i++){
    const town=province.towns[i];
    const slug=slugify(town);
    const dir=path.join(provinceDir,slug);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),renderTown(province,town,i));
    manifest.push({name:town,province:province.name,provinceSlug:province.slug,slug,path:`/${province.slug}/${slug}/`});
  }
}
fs.writeFileSync(path.join(ROOT,'local-pages-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(ROOT,'preview-manifest.json'),JSON.stringify({mode:'preview',towns:totalTowns,provinces:provinces.map(p=>({name:p.name,count:p.towns.length}))},null,2));
fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nDisallow: /\n`);
fs.writeFileSync(path.join(ROOT,'_headers'),`/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
fs.writeFileSync(path.join(ROOT,'404.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/styles.css"><title>Página no disponible | Antenas Abaso</title></head><body><main class="wrap section"><h1>Página no disponible</h1><p>Vuelve al inicio o consulta tu localidad por teléfono.</p><a class="btn btn-primary" href="/">Volver al inicio</a></main></body></html>`);

console.log(`BUILD ABASO OK: ${totalTowns} páginas locales + ${provinces.length} provincias + portada, todo en preview noindex.`);