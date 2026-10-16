/** Editorial service pages. Reuse Abaso's shell, contacts and local assets. */
import {createHash} from 'node:crypto';
import guides from '../content/service-guides.json' with {type:'json'};
export {guides};
export const GUIDE_VERSION='abaso-servicios-v1';
export const GUIDE_INDEX='/servicios/';
export const guideRoute=g=>`${GUIDE_INDEX}${g.slug}/`;
export const extraRoutes=[GUIDE_INDEX,...guides.map(guideRoute)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bySlug=new Map(guides.map(g=>[g.slug,g]));
const serviceMap={tdt:['reparacion-antenas-tdt','antenas-colectivas'],parabolicas:['antenas-parabolicas'],amplificacion:['amplificadores-antena'],porteros:['porteros-automaticos'],videoporteros:['videoporteros']};
export function serviceGuideLinks(id){
 return (serviceMap[id]||[]).map(slug=>`<a class="abaso-guide-link" href="${guideRoute(bySlug.get(slug))}">${esc(bySlug.get(slug).name)} <span aria-hidden="true">→</span></a>`).join('');
}
export function guideNavigation(){
 return `<section class="abaso-guide-entry" aria-labelledby="abaso-guia-provincia"><div class="wrap"><h2 id="abaso-guia-provincia">Qué revisar antes de pedir un presupuesto</h2><p>Además de elegir tu localidad, puedes consultar cómo se plantea el diagnóstico de cada instalación.</p><div class="abaso-guide-links">${guides.map(g=>`<a href="${guideRoute(g)}">${esc(g.name)} <span aria-hidden="true">→</span></a>`).join('')}</div><p><a class="province-back" href="${GUIDE_INDEX}">Ver todas las guías de servicios →</a></p></div></section>`;
}
export function enhanceHome(html){
 for(const id of Object.keys(serviceMap)){
  const re=new RegExp('<article\\b[^>]*\\bid="servicio-'+id+'"[^>]*>[\\s\\S]*?</article>','g');
  const matches=[...html.matchAll(re)];
  if(matches.length!==1)throw Error('Portada: tarjeta no reconocida '+id);
  html=html.replace(re,block=>block.replace('</article>',serviceGuideLinks(id)+'</article>'));
 }
 return html.replace('</head>',`<link rel="stylesheet" href="${GUIDE_CSS_PATH}"></head>`);
}
function breadcrumbs(g){return `<nav class="wrap breadcrumb" aria-label="Ruta de navegación"><a href="/">Inicio</a><span>/</span>${g?`<a href="${GUIDE_INDEX}">Servicios</a><span>/</span><span aria-current="page">${esc(g.name)}</span>`:'<span aria-current="page">Servicios</span>'}</nav>`;}
function graph(title,description,route,g,app){
 const base=app.domain,links=[['Inicio','/'],['Servicios',GUIDE_INDEX],...(g?[[g.name,route]]:[])];
 const items=[app.provider(),{'@type':'WebSite','@id':base+'/#website',name:'Antenas Abaso',url:base+'/'},{'@type':g?'WebPage':'CollectionPage','@id':base+route+'#page',url:base+route,name:title,description,inLanguage:'es',isPartOf:{'@id':base+'/#website'}},{'@type':'BreadcrumbList',itemListElement:links.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:base+url}))}];
 if(g)items.push({'@type':'Service','@id':base+route+'#service',name:g.name,url:base+route,description:g.intro,provider:{'@id':base+'/#organization'},areaServed:app.provinces.map(p=>({'@type':'AdministrativeArea',name:p.name}))});
 else items.push({'@type':'ItemList',itemListElement:guides.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,url:base+guideRoute(item)}))});
 return {'@context':'https://schema.org','@graph':items};
}
function contact(g,app){
 const message=`Hola, quiero consultar ${g?g.name.toLowerCase():'un servicio'} con Antenas Abaso. Mi municipio es: `;
 return `<section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>Cuéntanos qué necesitas y en qué pueblo</h2><p>Consulta disponibilidad y condiciones de visita antes de concertar el trabajo. No necesitas desmontar equipos para preparar el aviso.</p></div><div class="contact-actions"><a class="btn btn-light" href="${app.tel()}">${app.phone}</a><a class="btn btn-whatsapp-light" href="${esc(app.wa(message))}">WhatsApp</a></div></div></section>`;
}
function coverage(app){return `<section class="abaso-guide-zone wrap" id="localidad"><h2>Consulta el servicio para tu localidad</h2><p>Abre tu provincia y elige el municipio. La disponibilidad y el desplazamiento se confirman para la dirección concreta; este directorio no representa oficinas locales.</p><div class="abaso-guide-links">${app.provinces.map(p=>`<a href="/${p.slug}/">${esc(p.name)} <span aria-hidden="true">→</span></a>`).join('')}</div></section>`;}
export function renderGuide(g,app){
 const route=guideRoute(g),body=`${breadcrumbs(g)}<section class="abaso-guide-hero"><div class="wrap"><span class="eyebrow">Guía de servicio · Antenas Abaso</span><h1>${esc(g.name)}</h1><p class="abaso-guide-lead">${esc(g.intro)}</p><div class="hero-actions"><a class="btn btn-primary" href="${app.tel()}">Llamar ${app.phone}</a><a class="btn btn-whatsapp" href="${esc(app.wa('Hola, necesito consultar '+g.name.toLowerCase()+'. Mi municipio es: '))}">WhatsApp</a></div></div></section><div class="wrap abaso-guide-layout"><article class="abaso-guide-copy"><nav class="abaso-guide-toc" aria-label="En esta guía">${g.sections.map(s=>`<a href="#${s.id}">${esc(s.heading)}</a>`).join('')}<a href="#presupuesto">Qué concretar en el presupuesto</a></nav>${g.sections.map(s=>`<section class="abaso-guide-section" id="${s.id}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('')}<section class="abaso-guide-section abaso-guide-budget" id="presupuesto"><h2>Qué concretar en el presupuesto</h2><p>${esc(g.budget)}</p></section><section class="abaso-guide-section abaso-guide-faq" id="preguntas"><h2>Preguntas sobre este servicio</h2>${g.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section></article><aside class="abaso-guide-aside"><div class="abaso-guide-intake"><h2>Datos para preparar el aviso</h2><ul>${g.intake.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><a class="btn btn-primary" href="#contacto">Consultar al técnico</a></div><figure><img src="/assets/gallery/${g.image}" alt="${esc(g.imageAlt)}" loading="lazy" decoding="async"><figcaption>Imagen de referencia de equipos. No corresponde a un trabajo atribuido a una localidad.</figcaption></figure><div class="abaso-guide-related"><h2>Guías relacionadas</h2>${g.related.map(slug=>{const item=bySlug.get(slug);return `<a href="${guideRoute(item)}">${esc(item.name)} →</a>`;}).join('')}</div></aside></div>${coverage(app)}<section class="wrap abaso-guide-sources"><h2>Referencias técnicas</h2><p>Información de fabricantes y organismos para ampliar la consulta. No sustituye la revisión de tu instalación ni acredita una relación de servicio oficial.</p>${g.sources.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`).join('')}</section>${contact(g,app)}`;
 return `${app.head(g.title,g.description,route,graph(g.title,g.description,route,g,app))}<body>${app.header()}<main class="abaso-guide-page" id="contenido" data-abaso-guide="${GUIDE_VERSION}">${body}</main>${app.footer()}</body></html>`;
}
export function renderGuideIndex(app){
 const title=`Antenas y porteros: guías de servicios | ${app.phone}`;
 const description=`Consulta reparación de TDT, antenas colectivas, amplificación, parabólicas, porteros y videoporteros. Guías y contacto de Antenas Abaso: ${app.phone}.`;
 const cards=guides.map(g=>`<article><h2><a href="${guideRoute(g)}">${esc(g.name)}</a></h2><p>${esc(g.intro)}</p><a class="abaso-guide-link" href="${guideRoute(g)}">Ver diagnóstico, instalación y presupuesto →</a></article>`).join('');
 return `${app.head(title,description,GUIDE_INDEX,graph(title,description,GUIDE_INDEX,null,app))}<body>${app.header()}<main class="abaso-guide-page" id="contenido" data-abaso-guide="${GUIDE_VERSION}">${breadcrumbs()}<section class="abaso-guide-hero"><div class="wrap"><span class="eyebrow">Servicios técnicos</span><h1>Antenas y porteros: diagnóstico, instalación y reparación</h1><p class="abaso-guide-lead">Encuentra la explicación del servicio que necesitas: qué información facilita el aviso, qué revisa el técnico y qué conviene concretar antes de aceptar un presupuesto.</p></div></section><div class="wrap abaso-guide-catalogue">${cards}</div>${coverage(app)}${contact(null,app)}</main>${app.footer()}</body></html>`;
}
export const GUIDE_CSS=`/* Only the new guide pages and their contextual links. No masthead overrides. */
.service-card .abaso-guide-link{display:block;min-height:44px;margin-top:12px;padding:10px 0 0;border-top:1px solid var(--line);font-weight:750;color:var(--blue);line-height:1.45;overflow-wrap:anywhere}
.service-card .abaso-guide-link span{white-space:nowrap}
.abaso-guide-entry{padding:32px 0;border-top:1px solid var(--line);background:var(--paper)}
.abaso-guide-entry h2{font-size:26px;line-height:1.25;color:var(--navy);margin:0 0 12px}
.abaso-guide-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:22px 0}
.abaso-guide-links>a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:12px 16px;background:#fff;border:1px solid var(--line);border-radius:8px;font-weight:750;color:var(--navy);line-height:1.45;overflow-wrap:anywhere}
.abaso-guide-links>a span{flex:none}
.abaso-guide-hero{padding:42px 0;background:var(--soft);border-bottom:1px solid var(--line)}
.abaso-guide-hero h1{max-width:940px;font-size:clamp(30px,4vw,49px);line-height:1.12;letter-spacing:-.035em;color:var(--navy);margin:14px 0 18px;overflow-wrap:anywhere}
.abaso-guide-lead{max-width:870px;font-size:18px;line-height:1.7;margin:0}
.abaso-guide-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:44px;padding-top:38px;padding-bottom:30px}
.abaso-guide-copy,.abaso-guide-aside{min-width:0}
.abaso-guide-toc{display:flex;flex-direction:column;height:auto;width:100%;position:static;margin:0 0 30px;padding:18px 22px;background:var(--paper);border-left:3px solid var(--amber);gap:4px;align-items:stretch}
.abaso-guide-toc a{display:block;padding:8px 0;min-height:40px;font-size:15px;line-height:1.5;color:var(--blue);font-weight:650;overflow-wrap:anywhere}
.abaso-guide-section{margin:0 0 34px;scroll-margin-top:110px}
.abaso-guide-section h2,.abaso-guide-zone h2,.abaso-guide-sources h2{font-size:clamp(23px,2.6vw,29px);line-height:1.25;color:var(--navy);margin:0 0 16px}
.abaso-guide-copy p{font-size:16px;line-height:1.8;margin:0 0 16px}
.abaso-guide-budget{padding:24px;background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:8px}
.abaso-guide-budget p{margin-bottom:0}
.abaso-guide-intake,.abaso-guide-related{padding:24px;border:1px solid var(--line);border-radius:10px;background:var(--paper);margin-bottom:24px}
.abaso-guide-aside h2{font-size:21px;line-height:1.3;margin:0 0 16px;color:var(--navy)}
.abaso-guide-intake ul{padding-left:20px;margin:0 0 20px}
.abaso-guide-intake li{margin-bottom:14px;line-height:1.7}
.abaso-guide-aside figure{margin:0 0 24px}
.abaso-guide-aside img{display:block;width:100%;height:auto;border-radius:8px}
.abaso-guide-aside figcaption{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.6}
.abaso-guide-related a,.abaso-guide-sources>a{display:block;min-height:44px;padding:9px 0;color:var(--blue);font-weight:650;line-height:1.5;overflow-wrap:anywhere}
.abaso-guide-faq details{padding:18px 0;border-top:1px solid var(--line)}
.abaso-guide-faq summary{font-weight:750;cursor:pointer;line-height:1.6;color:var(--navy)}
.abaso-guide-faq details p{margin:16px 0 0}
.abaso-guide-zone,.abaso-guide-sources{padding-top:30px;padding-bottom:30px;border-top:1px solid var(--line);scroll-margin-top:110px}
.abaso-guide-sources p{max-width:870px;color:var(--muted)}
.abaso-guide-catalogue{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding-top:36px;padding-bottom:36px}
.abaso-guide-catalogue article{min-width:0;padding:24px;border:1px solid var(--line);border-top:3px solid var(--amber);border-radius:12px}
.abaso-guide-catalogue h2{font-size:23px;line-height:1.3;color:var(--navy);margin:0 0 14px}
.abaso-guide-catalogue .abaso-guide-link{display:block;min-height:44px;padding:10px 0;color:var(--blue);font-weight:750}
.abaso-guide-page a:focus-visible,.abaso-guide-entry a:focus-visible,.abaso-guide-link:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
@media(max-width:900px){.abaso-guide-layout{grid-template-columns:minmax(0,1fr);gap:12px}.abaso-guide-aside{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}.abaso-guide-aside>figure{display:none}.abaso-guide-links{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.abaso-guide-hero{padding:28px 0}.abaso-guide-hero .hero-actions{gap:10px}.abaso-guide-hero .btn{min-width:0;flex:1 1 160px;padding:12px}.abaso-guide-layout{padding-top:24px}.abaso-guide-aside,.abaso-guide-catalogue,.abaso-guide-links{grid-template-columns:minmax(0,1fr)}.abaso-guide-aside{gap:0}.abaso-guide-lead{font-size:16px}.abaso-guide-entry h2{font-size:23px}.abaso-guide-intake,.abaso-guide-related,.abaso-guide-budget{padding:20px}}
`;
export const GUIDE_CSS_PATH='/assets/abaso-guides.'+createHash('sha256').update(GUIDE_CSS).digest('hex').slice(0,12)+'.css';
