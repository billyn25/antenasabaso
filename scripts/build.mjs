import fs from 'node:fs';
import path from 'node:path';
import services from '../content/services.json' with { type: 'json' };
import { provinces, totalTowns } from '../content/municipios.mjs';
import { comarcaFor, townsInComarca } from '../content/comarcas.mjs';

const ROOT = path.resolve('dist');
const DOMAIN = 'https://www.antenasabaso.com';
const PHONE = '670 042 626';
const TEL = '+34670042626';
const WA = '34670042626';
const PHRASE = 'Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';

// Esta entrega sigue siendo de revisión. No sustituir el dominio vivo con un paquete noindex.
if (process.env.SITE_MODE === 'production') throw new Error('La publicación indexable requiere preparar y auditar la migración.');
for (const value of [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean)) {
  if (new URL(value).hostname.replace(/^www\./, '') === 'antenasabaso.com') {
    throw new Error('No publicar este paquete noindex en el dominio actual de Antenas Abaso.');
  }
}

// Una sola fuente del logo: las páginas y el favicon reutilizan la parabólica aprobada.
const homeSource = fs.readFileSync(path.resolve('index.html'), 'utf8');
const brandSvg = homeSource.match(/<svg\b[^>]*data-logo="parabolica"[^>]*>[\s\S]*?<\/svg>/)?.[0];
if (!brandSvg) throw new Error('Falta el SVG de la parabólica de Antenas Abaso en la portada');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = value => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const hash = value => { let h=2166136261; for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;} return h>>>0; };
const canonical = route => new URL(route, DOMAIN).href;
const tel = () => 'tel:' + TEL;
const wa = text => 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);
const provider = () => ({'@type':'Organization','@id':DOMAIN+'/#organization',name:'Antenas Abaso',url:DOMAIN+'/',telephone:TEL});

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
  t=>`Instalación y mantenimiento técnico en ${t}`,
  t=>`Averías de antena, portero y señal en ${t}`,
  t=>`Revisión de TDT, satélite y telecomunicaciones en ${t}`,
  t=>`Servicio para viviendas y comunidades en ${t}`,
  t=>`Diagnóstico de antenas y porteros en ${t}`
];

const serviceTextVariants = {
  tdt:[
    t=>`En ${t} revisamos antenas TDT individuales y colectivas, nivel de señal, orientación, cableado, repartidores y tomas cuando faltan canales o la imagen se corta.`,
    t=>`Si la TDT falla en ${t}, comprobamos primero si el problema está en recepción, amplificación, distribución o una toma concreta antes de sustituir componentes.`,
    t=>`Para instalaciones TDT de ${t} podemos revisar antena, mástil, conexiones, cableado y reparto de señal tanto en viviendas como en comunidades.`,
    t=>`Una pérdida de señal TDT en ${t} puede venir de varios puntos. La revisión se plantea desde la recepción hasta las tomas para localizar el origen de la incidencia.`
  ],
  parabolicas:[
    t=>`En ${t} revisamos orientación de parabólicas, LNB, conectores, cableado y recepción por satélite antes de decidir qué elemento necesita ajuste o cambio.`,
    t=>`Para una parabólica con poca o ninguna señal en ${t}, se comprueban orientación, estado del LNB y continuidad del cableado.`,
    t=>`Instalamos y ajustamos antenas parabólicas en ${t} para viviendas y comunidades, valorando ubicación, soporte, orientación y recorrido de cable.`,
    t=>`Si la recepción satélite falla en ${t}, diferenciamos primero entre un problema de antena, LNB, conexión o distribución interior.`
  ],
  amplificacion:[
    t=>`Cuando la señal llega débil a una o varias tomas de ${t}, revisamos amplificadores, fuentes, repartidores y cableado antes de aumentar ganancia sin diagnóstico.`,
    t=>`En ${t} podemos revisar la distribución de TV cuando unas tomas funcionan y otras no, comprobando derivaciones, conexiones y elementos de amplificación.`,
    t=>`Para añadir o corregir tomas de televisión en ${t}, comprobamos cómo está repartida la señal y qué recorrido de cableado resulta viable.`,
    t=>`Una amplificación excesiva también puede dar problemas. En ${t} revisamos niveles y distribución para ajustar la instalación a lo que realmente necesita.`
  ],
  porteros:[
    t=>`En porteros automáticos de ${t} revisamos llamada, audio, alimentación, placa y apertura, distinguiendo si la avería afecta a una vivienda o a toda la comunidad.`,
    t=>`Si el portero de ${t} no llama, no se oye o no abre, comprobamos la función afectada y el sistema existente antes de plantear una sustitución completa.`,
    t=>`Reparamos e instalamos porteros automáticos en ${t} para viviendas y comunidades, revisando placa, telefonillos, audio y abrepuertas.`,
    t=>`En ${t}, una avería de portero puede estar en placa, telefonillo, alimentación, cableado o apertura. La revisión busca acotar el fallo antes de renovar equipos.`
  ],
  videoporteros:[
    t=>`En ${t} revisamos monitores, cámaras, placas, alimentación y cableado de videoportero, teniendo en cuenta la compatibilidad del sistema instalado.`,
    t=>`Si un videoportero de ${t} ha perdido imagen, llamada o apertura, comprobamos qué funciones siguen operativas y qué equipo está instalado.`,
    t=>`Para renovar un videoportero en ${t}, revisamos primero el cableado y la tecnología existente para valorar qué parte de la instalación puede aprovecharse.`,
    t=>`Instalamos y reparamos videoporteros en ${t}, desde placas exteriores y cámaras hasta monitores interiores y sistemas de apertura.`
  ],
  'cobertura-movil':[
    t=>`Para una vivienda de ${t} con poca cobertura móvil, valoramos operador, señal disponible y equipo antes de plantear una antena exterior 4G/5G.`,
    t=>`Si un router 4G/5G recibe poca señal en ${t}, revisamos modelo, conectores y condiciones de recepción para valorar la solución de antena adecuada.`,
    t=>`En ${t} podemos estudiar soluciones de antena exterior para mejorar datos móviles en vivienda cuando existe señal aprovechable en el exterior.`,
    t=>`La mejora de cobertura móvil en ${t} depende de operador, bandas, ubicación y router. Por eso se valora la señal antes de elegir antena y cableado.`
  ],
  electricidad:[
    t=>`En ${t} atendemos pequeñas averías eléctricas en viviendas, comercios y comunidades, revisando el punto o circuito afectado antes de intervenir.`,
    t=>`Para una reparación eléctrica en ${t}, conviene indicar si falla un enchufe, interruptor, punto de luz o circuito y si la avería es continua o intermitente.`,
    t=>`Realizamos pequeñas reparaciones eléctricas en ${t} y comprobaciones básicas de la instalación relacionadas con la avería comunicada.`,
    t=>`Si hay una avería eléctrica localizada en ${t}, revisamos el síntoma y la instalación afectada para concretar la reparación necesaria.`
  ]
};

const processLeadVariants = [
  t=>`Primero identificamos el síntoma en ${t}, después revisamos la instalación existente y solo entonces valoramos reparación, ajuste o sustitución.`,
  t=>`Cada aviso en ${t} empieza por concretar qué falla y a quién afecta. Esa información permite revisar la instalación con un orden lógico.`,
  t=>`Antes de cambiar equipos en ${t}, comprobamos señal, alimentación, conexiones y compatibilidades según el tipo de instalación.`,
  t=>`La intervención en ${t} se decide después del diagnóstico: puede bastar un ajuste, requerir una reparación o hacer recomendable renovar una parte del sistema.`
];

const localIntentVariants = [
  ['La TDT se corta o pixela', t=>`Si la televisión se corta en ${t}, primero conviene distinguir si falla una sola toma, varios televisores o toda la instalación. Revisamos señal, conexiones, amplificación y distribución antes de plantear cambios.`],
  ['Faltan canales de televisión', t=>`Cuando faltan canales en ${t}, una resintonización no siempre resuelve el origen. Se puede comprobar recepción, cabecera, amplificador, cableado y tomas según el tipo de instalación.`],
  ['Necesito otra toma de TV', t=>`Para añadir una toma de televisión en ${t}, revisamos por dónde llega la señal y cómo está distribuida para valorar la nueva derivación y el cableado necesario.`],
  ['La parabólica ha perdido señal', t=>`Si la recepción por satélite falla en ${t}, se comprueban orientación, LNB, conectores y cableado antes de sustituir componentes.`],
  ['El portero llama pero no se oye', t=>`Si el portero automático de ${t} llama pero falla el audio, interesa saber si ocurre en un solo telefonillo o en varios. Ese dato ayuda a acotar la revisión.`],
  ['El portero no abre la puerta', t=>`Cuando el abrepuertas no responde en ${t}, se revisa el síntoma desde el telefonillo o monitor hasta la placa y el sistema de apertura, según la instalación existente.`],
  ['El videoportero no muestra imagen', t=>`Si el monitor de videoportero de ${t} ha perdido imagen, indícanos marca y modelo visibles y si la llamada y la apertura siguen funcionando. Así se prepara mejor la comprobación.`],
  ['Quiero renovar el videoportero', t=>`Para renovar un videoportero en ${t}, conviene revisar primero el cableado y el sistema existente. La compatibilidad condiciona qué equipos pueden aprovecharse y cuáles deben sustituirse.`],
  ['Hay poca cobertura móvil en casa', t=>`Si en una vivienda de ${t} hay poca cobertura móvil, necesitamos saber operador, router o teléfono afectado y si el problema es de llamadas, datos o ambos antes de valorar una antena exterior.`],
  ['El router 4G/5G recibe poca señal', t=>`Para mejorar un router 4G/5G en ${t}, la antena y su ubicación dependen de la señal realmente disponible. No todos los routers ni conectores admiten la misma solución.`],
  ['Hay una pequeña avería eléctrica', t=>`Para una avería eléctrica en ${t}, describe qué circuito, enchufe, interruptor o punto de luz falla y si el problema es permanente o intermitente. Eso permite preparar la revisión con más precisión.`],
  ['La avería afecta a una comunidad', t=>`Si la incidencia en ${t} afecta a una comunidad, dinos si ocurre en todas las viviendas o zonas comunes o solo en una parte. Esa diferencia cambia el punto por el que conviene empezar a revisar.`]
];

const contactPrepItems = [
  'Si el problema afecta a un solo televisor o a varios.',
  'Si la incidencia ocurre siempre o solo en determinados momentos.',
  'La marca y el modelo visibles del equipo, si se pueden consultar.',
  'Si se trata de una vivienda individual, una comunidad o un pequeño negocio.',
  'Desde cuándo ocurre la avería y si apareció después de algún cambio.',
  'Si faltan todos los canales o únicamente algunos.',
  'Si una segunda toma de televisión funciona correctamente.',
  'Si el portero falla en llamada, audio, apertura o en varias funciones.',
  'Si el videoportero conserva audio aunque haya perdido imagen.',
  'Si la avería de portero afecta a una vivienda o a varios vecinos.',
  'Si la parabólica ha perdido señal por completo o de forma intermitente.',
  'Si conoces el operador cuando la consulta es por cobertura móvil.',
  'El modelo del router y sus conectores cuando la consulta es 4G/5G.',
  'Una foto clara de la placa, monitor, amplificador, router o equipo visible.',
  'Cuántas tomas o puntos se quieren añadir en una instalación nueva.',
  'Si ya existe cableado aprovechable hasta la zona donde se necesita servicio.',
  'Si una avería eléctrica afecta a un punto concreto o a todo un circuito.',
  'Si ha saltado alguna protección del cuadro eléctrico.',
  'Si la instalación es individual o forma parte de una red comunitaria.',
  'Un teléfono de contacto y la franja en la que resulta más fácil localizarte.'
];

function localPrep(town){
  const selected=contactPrepItems
    .map((text,index)=>({text,score:hash(`${town}|prep|${index}`)}))
    .sort((a,b)=>a.score-b.score)
    .slice(0,5);
  return `<section class="local-prep"><div class="wrap local-prep-layout"><div><span class="eyebrow">Antes de contactar</span><h2>Qué datos ayudan a preparar el aviso en ${esc(town)}</h2><p>No hace falta comprobar nada peligroso ni desmontar equipos. Con algunos datos básicos podemos entender mejor el tipo de incidencia.</p></div><ul>${selected.map(item=>`<li>${esc(item.text)}</li>`).join('')}</ul></div></section>`;
}

const localFaqVariants = [
  [t=>`¿Reparáis antenas TDT en ${t}?`, t=>`Sí. Se puede revisar señal, orientación, amplificación, cableado, repartidores y tomas en instalaciones individuales o colectivas de ${t}.`],
  [t=>`¿Podéis revisar un portero automático en ${t} sin cambiarlo entero?`, t=>`Sí. Primero se comprueba qué función falla —llamada, audio o apertura— y el estado del sistema antes de valorar una sustitución completa.`],
  [t=>`¿Trabajáis con videoporteros antiguos en ${t}?`, t=>`Podemos revisar el equipo existente y su cableado. La posibilidad de reparar o sustituir depende de la marca, el modelo, la avería y la compatibilidad disponible.`],
  [t=>`¿Instaláis antenas para router 4G/5G en ${t}?`, t=>`Se puede valorar una antena exterior cuando la señal es insuficiente. Antes necesitamos conocer operador, modelo de router y conectores disponibles.`],
  [t=>`¿Atendéis viviendas y comunidades en ${t}?`, t=>`Sí. El diagnóstico cambia según sea una instalación individual o comunitaria, por eso conviene indicar a cuántos usuarios afecta la incidencia.`],
  [t=>`¿Qué datos tengo que dar al llamar desde ${t}?`, t=>`Indica la localidad, el tipo de instalación, qué falla, desde cuándo ocurre y, si puedes, la marca o modelo visible del equipo.`],
  [t=>`¿Se puede añadir una toma de televisión en ${t}?`, t=>`Sí, después de comprobar cómo está distribuida la señal y por dónde puede realizarse la nueva derivación y el cableado.`],
  [t=>`¿Revisáis parabólicas en ${t}?`, t=>`Sí. Se puede comprobar orientación, LNB, conectores, cableado y recepción antes de decidir qué componente necesita intervención.`],
  [t=>`¿Hacéis pequeñas reparaciones eléctricas en ${t}?`, t=>`Sí, para averías y pequeñas reparaciones en viviendas, comercios y comunidades. Al contactar conviene describir el punto o circuito afectado.`],
  [t=>`¿Puedo enviar una foto del equipo antes de la visita?`, t=>`Sí. Una foto de la marca, modelo, placa, monitor, amplificador o router puede ayudar a identificar el sistema y preparar la revisión.`]
];

function selectDistinct(pool,start,count,step=5){
  const out=[];
  for(let i=0;out.length<count&&i<pool.length*2;i++){
    const item=pool[(start+i*step)%pool.length];
    if(!out.includes(item)) out.push(item);
  }
  return out;
}

function localIntentSections(town,h){
  const intents=selectDistinct(localIntentVariants,h%localIntentVariants.length,4,5);
  const faqs=selectDistinct(localFaqVariants,(h>>>5)%localFaqVariants.length,3,3);
  const intentHtml=`<section class="local-intents"><div class="wrap"><span class="eyebrow">Casos habituales</span><h2>Qué podemos revisar en ${esc(town)}</h2><div class="local-intents-grid">${intents.map(([title,text])=>`<article><h3>${esc(title)}</h3><p>${esc(text(town))}</p></article>`).join('')}</div></div></section>`;
  const faqHtml=`<section class="local-faq"><div class="wrap"><span class="eyebrow">Preguntas frecuentes</span><h2>Antes de pedir servicio en ${esc(town)}</h2><div class="local-faq-list">${faqs.map(([q,a])=>`<details><summary>${esc(q(town))}</summary><p>${esc(a(town))}</p></details>`).join('')}</div></div></section>`;
  return intentHtml+faqHtml;
}

function fitTitle(town, province){
  const candidates = [
    `Antenista en ${town}, ${province} | ${PHONE}`,
    `Antenas en ${town}, ${province} | ${PHONE}`,
    `Antenista ${town} | ${PHONE}`
  ];
  // 70 es un criterio editorial, no un límite de Google. Nunca cortar el nombre ni el teléfono.
  return candidates.find(x=>x.length<=70) || candidates[2];
}
function metaDescription(town, province){
  // La localidad y el contacto van al principio; la definición del servicio se mantiene íntegra.
  return `${town}, ${province} · ${PHONE}. ${PHRASE}.`;
}
function brand(){
  return `<a class="brand" href="/" aria-label="Antenas Abaso, inicio"><span class="brand-mark brand-mark-abaso" aria-hidden="true">${brandSvg}</span><span class="brand-copy"><b>ANTENAS</b><strong>ABASO</strong></span></a>`;
}
function header(contactHref='#contacto'){
  return `<div class="topbar"><div class="wrap topbar-inner"><span>Instalador autorizado nº 11024</span><div><strong>Urgencias 24h</strong><span class="dot">·</span><a href="${tel()}">${PHONE}</a></div></div></div><header class="site-header"><div class="wrap header-inner">${brand()}<nav class="main-nav" aria-label="Navegación principal"><a href="/#servicios">Servicios</a><a href="/#euskadi">Municipios</a><a href="/#confianza">Confianza</a><a href="${contactHref}">Contacto</a></nav><a class="header-phone" href="${tel()}"><small>Llámanos ahora</small><strong>${PHONE}</strong></a></div></header>`;
}

function localTrustStrip(town){
  return `<section class="local-trust-strip" aria-label="Datos de servicio en ${esc(town)}"><div class="wrap local-trust-grid"><div><small>Experiencia</small><strong>20 años</strong></div><div><small>Instalador autorizado</small><strong>nº 11024</strong></div><div><small>Urgencias</small><strong>24h</strong></div><div><small>Ámbito</small><strong>${esc(town)}</strong></div></div></section>`;
}

function localTerritory(province,town){
  const comarca=comarcaFor(province.slug,town);
  return `<section class="local-territory"><div class="wrap local-territory-inner"><div><span class="eyebrow">Contexto territorial</span><h2>${esc(town)} · ${esc(comarca)}</h2><p>${esc(town)} pertenece a la comarca ${esc(comarca)}, dentro del Territorio Histórico de ${esc(province.name)}. Desde aquí puedes consultar el servicio de la localidad y acceder al directorio completo de ${province.towns.length} municipios de ${esc(province.name)}.</p></div><a class="province-back" href="/${province.slug}/">Ver municipios de ${esc(province.name)} →</a></div></section>`;
}

function localProcess(town,h){
  const lead=processLeadVariants[(h>>>11)%processLeadVariants.length](town);
  return `<section class="local-process"><div class="wrap"><div class="local-process-head"><div><span class="eyebrow">Cómo trabajamos</span><h2>Así planteamos una intervención en ${esc(town)}</h2></div><p>${esc(lead)}</p></div><div class="local-process-grid"><article><span>01</span><h3>Nos cuentas qué ocurre</h3><p>Indica si es antena, portero, videoportero, cobertura móvil o electricidad y qué parte de la instalación está fallando.</p></article><article><span>02</span><h3>Revisamos antes de sustituir</h3><p>Comprobamos señal, cableado, conexiones, alimentación y compatibilidades según el sistema existente.</p></article><article><span>03</span><h3>Te explicamos la solución</h3><p>La intervención se plantea según lo que encontremos: ajuste, reparación, ampliación o renovación del equipo.</p></article></div></div></section>`;
}

function localBrands(town){
  const antennaBrands=['Televés','Alcad','Ikusi','Fagor','Rover','EK','FTE Maximal','Fringe'];
  const doorBrands=['Fermax','Tegui','Golmar','Comelit','Bticino','Legrand','Fringe','Galak'];
  return `<section class="local-brands"><div class="wrap local-brands-layout"><div><span class="eyebrow">Equipos antiguos y actuales</span><h2>Marcas que podemos revisar en ${esc(town)}</h2><p>La reparación o sustitución depende del modelo, del estado del cableado y de la compatibilidad disponible.</p></div><div class="local-brand-groups"><div><h3>Antenas y amplificación</h3><p>${antennaBrands.map(esc).join(' · ')}</p></div><div><h3>Porteros y videoporteros</h3><p>${doorBrands.map(esc).join(' · ')}</p></div></div></div></section>`;
}

function cookieNotice(){
  return `<aside class="cookie-notice" data-cookie-notice hidden aria-label="Información sobre cookies"><div class="cookie-notice-copy"><strong>Privacidad clara, sin cookies publicitarias</strong><p>Esta versión no utiliza cookies de analítica ni publicidad. Solo guardamos en tu navegador que has cerrado este aviso.</p></div><div class="cookie-notice-actions"><a href="/cookies/">Política de cookies</a><button type="button" data-cookie-dismiss>Entendido</button></div></aside>`;
}
function footer(location=''){
  const message = location ? `Hola, necesito consultar un servicio en ${location} con Antenas Abaso.` : 'Hola, necesito consultar un servicio con Antenas Abaso.';
  return `<footer class="footer"><div class="wrap footer-grid"><div><strong>Antenas Abaso</strong><p>${PHRASE}. Servicio en municipios de Bizkaia, Gipuzkoa y Álava. Tel. <a href="${tel()}">${PHONE}</a>.</p></div><div><strong>Contacto</strong><p><a href="${tel()}">${PHONE}</a><br><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></p></div><div><strong>Cobertura</strong><p><a href="/bizkaia/">Bizkaia</a> · <a href="/gipuzkoa/">Gipuzkoa</a> · <a href="/alava/">Álava</a></p></div><div class="footer-legal"><strong>Información legal</strong><p><a href="/aviso-legal/">Aviso legal</a><br><a href="/privacidad/">Privacidad</a><br><a href="/cookies/">Cookies</a></p></div></div><div class="wrap footer-bottom"><span>© Antenas Abaso</span><span>Instalador autorizado nº 11024</span></div></footer>${cookieNotice()}<div class="mobile-bar"><a href="${tel()}">Llamar</a><a href="${esc(wa(message))}">WhatsApp</a></div>`;
}
function head(title,description,route,structured){
  const socialImage=DOMAIN+'/assets/gallery/parabolica-realista.webp';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${esc(canonical(route))}"><link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical(route))}"><meta property="og:type" content="website"><meta property="og:site_name" content="Antenas Abaso"><meta property="og:image" content="${socialImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${socialImage}"><meta name="theme-color" content="#18324a"><link rel="stylesheet" href="/styles.css"><script src="/site.js" defer></script><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head>`;
}
function serviceCards(town='',h=0){
  return services.map((s,i)=>{
    const variants=serviceTextVariants[s.id]||[];
    const text=town&&variants.length?variants[hash(`${town}|${s.id}`)%variants.length](town):s.text;
    return `<article class="service-card${i===0?' featured':''}" id="servicio-${s.id}"><span class="num">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.name)}${town?' en '+esc(town):''}</h3><p>${esc(text)}</p>${town?`<a class="province-back" href="${esc(wa(`Hola, necesito ${s.name.toLowerCase()} en ${town}. Quería consultar la revisión y las condiciones.`))}">Consultar este servicio →</a>`:''}</article>`;
  }).join('');
}

function breadcrumbData(province,town=''){
  const trail=[{name:'Inicio',item:DOMAIN+'/'},{name:province.name,item:canonical('/'+province.slug+'/')}];
  if(town) trail.push({name:town,item:canonical(`/${province.slug}/${slugify(town)}/`)});
  return {'@type':'BreadcrumbList',itemListElement:trail.map((x,i)=>({'@type':'ListItem',position:i+1,...x}))};
}
function localStructured(title,description,route,town,province){
  return {'@context':'https://schema.org','@graph':[
    provider(),
    {'@type':'WebSite','@id':DOMAIN+'/#website',name:'Antenas Abaso',url:DOMAIN+'/'},
    {'@type':'WebPage','@id':canonical(route)+'#page',name:title,url:canonical(route),description,isPartOf:{'@id':DOMAIN+'/#website'}},
    breadcrumbData(province,town),
    {'@type':'Service','@id':canonical(route)+'#service',name:`Servicio técnico de antenas en ${town}`,description:PHRASE,serviceType:services.map(s=>s.name),areaServed:{'@type':'AdministrativeArea',name:`${town}, ${province.name}`},provider:{'@id':DOMAIN+'/#organization'}}
  ]};
}
function renderTown(province,town,index){
  const townSlug=slugify(town);
  const route=`/${province.slug}/${townSlug}/`;
  const title=fitTitle(town,province.name);
  const description=metaDescription(town,province.name);
  const h=hash(`${province.slug}|${town}`);
  const comarcaPeers=townsInComarca(province.slug,town).filter(x=>x!==town);
  const provincePeers=province.towns.filter(x=>x!==town&&!comarcaPeers.includes(x));
  const pool=[...comarcaPeers,...provincePeers];
  const related=Array.from({length:Math.min(6,pool.length)},(_,i)=>pool[(h+i*5)%pool.length]);
  return `${head(title,description,route,localStructured(title,description,route,town,province))}<body>${header()}<main class="local-page"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><a href="/${province.slug}/">${esc(province.name)}</a><span>/</span><span aria-current="page">${esc(town)}</span></nav><section class="local-hero"><div class="wrap local-hero-grid"><div><span class="eyebrow">Servicio técnico en ${esc(town)}</span><h1>Antenista en ${esc(town)}, ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p class="local-lead">${esc(introVariants[h%introVariants.length](town,province.name))}</p><div class="hero-actions"><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a><a class="btn btn-whatsapp" href="${wa(`Hola, necesito un servicio en ${town}.`)}">WhatsApp</a></div></div><aside class="local-contact"><small>Consulta directa</small><strong>${PHONE}</strong><p>Indica ${esc(town)} y qué problema presenta la instalación.</p><a href="${tel()}">Llamar ahora →</a></aside></div></section>${localTrustStrip(town)}<section class="section services"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Servicios en ${esc(town)}</span><h2>${esc(focusVariants[(h>>>3)%focusVariants.length](town))}</h2></div><p>${esc(adviceVariants[(h>>>7)%adviceVariants.length](town))}</p></div><div class="service-grid">${serviceCards(town,h)}</div></div></section>${localTerritory(province,town)}${localProcess(town,h)}${localPrep(town)}${localBrands(town)}${localIntentSections(town,h)}<section class="local-related"><div class="wrap"><span class="eyebrow">Más localidades</span><h2>Otros municipios de ${esc(comarcaFor(province.slug,town))}</h2><div class="related-grid">${related.map(x=>`<a href="/${province.slug}/${slugify(x)}/">${esc(x)} →</a>`).join('')}</div><a class="province-back" href="/${province.slug}/">Ver los ${province.towns.length} municipios de ${esc(province.name)} →</a></div></section><section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>Servicio en ${esc(town)}</h2><p>Cuéntanos el tipo de instalación y qué ocurre. Consulta las condiciones de visita y diagnóstico antes de concertar la atención.</p></div><div class="contact-actions"><a class="btn btn-light" href="${tel()}">${PHONE}</a><a class="btn btn-whatsapp-light" href="${wa(`Hola, necesito un servicio en ${town}.`)}">WhatsApp</a></div></div></section></main>${footer(town)}</body></html>`;
}

function legalBreadcrumb(title,route){
  return {'@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Inicio',item:DOMAIN+'/'},
    {'@type':'ListItem',position:2,name:title,item:canonical(route)}
  ]};
}
function legalStructured(title,description,route){
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':canonical(route)+'#page',name:title,url:canonical(route),description,isPartOf:{'@id':DOMAIN+'/#website'}},
    legalBreadcrumb(title,route)
  ]};
}
function legalAside(current){
  const items=[['/aviso-legal/','Aviso legal'],['/privacidad/','Privacidad'],['/cookies/','Cookies']];
  return `<aside class="legal-aside"><strong>Información de Antenas Abaso</strong><p>Documentación del sitio web y tratamiento de la información.</p>${items.map(([href,label])=>`<a href="${href}"${href===current?' aria-current="page"':''}>${label}</a>`).join('')}</aside>`;
}
function renderLegalPage({route,title,description,kicker,h1,lead,content}){
  return `${head(title,description,route,legalStructured(title,description,route))}<body>${header('/#contacto')}<main class="legal-page"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span aria-current="page">${esc(h1)}</span></nav><section class="legal-hero"><div class="wrap"><span class="eyebrow">${esc(kicker)}</span><h1>${esc(h1)}</h1><p>${esc(lead)}</p></div></section><section class="legal-content"><div class="wrap legal-layout"><article class="legal-copy">${content}<p class="legal-update">Última actualización: 23 de septiembre de 2026.</p></article>${legalAside(route)}</div></section></main>${footer()}</body></html>`;
}

const legalPages=[
  {
    route:'/aviso-legal/',
    title:'Aviso legal | Antenas Abaso',
    description:'Aviso legal de Antenas Abaso, titular de antenasabaso.com: datos de contacto, condiciones de uso, propiedad intelectual y legislación aplicable.',
    kicker:'Información del titular',
    h1:'Aviso legal',
    lead:'Información identificativa y condiciones generales de uso de antenasabaso.com.',
    content:`<h2>Datos identificativos</h2><p>En cumplimiento de la normativa aplicable a los servicios de la sociedad de la información, se facilita la información disponible del titular de este sitio web.</p><dl class="legal-data"><div><dt>Titular</dt><dd>ANTENAS ABASO</dd></div><div><dt>Actividad</dt><dd>Instalación, reparación y mantenimiento de telecomunicaciones, antenas, porteros, videoporteros y pequeñas reparaciones eléctricas.</dd></div><div><dt>Domicilio</dt><dd>48010 Bilbao, Bizkaia</dd></div><div><dt>Teléfono</dt><dd><a href="${tel()}">${PHONE}</a></dd></div><div><dt>Correo electrónico</dt><dd><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></dd></div><div><dt>Web</dt><dd>www.antenasabaso.com</dd></div></dl><h2>Objeto del sitio web</h2><p>El objetivo de esta web es informar sobre los servicios de Antenas Abaso y facilitar el contacto de personas interesadas en una instalación, reparación, mantenimiento o consulta técnica.</p><h2>Condiciones de uso</h2><p>El acceso a la web implica un uso responsable y conforme a la legislación vigente. El usuario se compromete a no utilizar el sitio, sus contenidos o sus enlaces con fines ilícitos o que puedan perjudicar a terceros.</p><h2>Propiedad intelectual e industrial</h2><p>Los textos, diseño, elementos gráficos, logotipo y demás contenidos propios de esta web están protegidos por la normativa aplicable. No se autoriza su reproducción o explotación fuera de los usos permitidos legalmente sin autorización del titular.</p><h2>Contenido y enlaces externos</h2><p>Antenas Abaso procura mantener la información actualizada y útil. Los enlaces a servicios de terceros, como WhatsApp, se facilitan para mejorar el contacto y quedan sujetos a las condiciones y políticas de esos terceros.</p><h2>Responsabilidad</h2><p>No se garantiza la ausencia absoluta de interrupciones o errores técnicos. La información del sitio es de carácter general y no sustituye la revisión técnica de una instalación concreta.</p><h2>Legislación aplicable</h2><p>Las relaciones derivadas del uso de esta web se rigen por la legislación española, sin perjuicio de los derechos que correspondan a consumidores y usuarios.</p>`
  },
  {
    route:'/privacidad/',
    title:'Política de privacidad | Antenas Abaso',
    description:'Política de privacidad de Antenas Abaso: qué datos se tratan al contactar, para qué se utilizan, conservación, destinatarios y derechos de las personas.',
    kicker:'Protección de datos',
    h1:'Política de privacidad',
    lead:'Explicamos de forma clara qué ocurre con la información que facilitas cuando contactas con Antenas Abaso.',
    content:`<h2>Responsable del tratamiento</h2><dl class="legal-data"><div><dt>Responsable</dt><dd>ANTENAS ABASO</dd></div><div><dt>Domicilio</dt><dd>48010 Bilbao, Bizkaia</dd></div><div><dt>Correo electrónico</dt><dd><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></dd></div><div><dt>Teléfono</dt><dd><a href="${tel()}">${PHONE}</a></dd></div></dl><h2>Qué datos podemos tratar</h2><p>Esta web no incluye actualmente un formulario de contacto. Si decides contactar por teléfono, correo electrónico o WhatsApp, podremos tratar los datos que facilites voluntariamente, como nombre, teléfono, dirección o localidad, datos de contacto y la información necesaria para entender el servicio solicitado.</p><h2>Para qué utilizamos los datos</h2><ul><li>Responder a consultas y solicitudes de presupuesto.</li><li>Organizar visitas, instalaciones, reparaciones y servicios solicitados.</li><li>Mantener las comunicaciones necesarias durante la prestación del servicio.</li><li>Cumplir obligaciones administrativas, contables o legales cuando corresponda.</li></ul><h2>Base jurídica</h2><p>El tratamiento puede basarse en la aplicación de medidas solicitadas por la persona interesada antes de contratar, en la ejecución de una relación contractual y, cuando proceda, en el consentimiento para finalidades opcionales.</p><h2>Destinatarios</h2><p>No se ceden datos a terceros salvo cuando resulte necesario para prestar un servicio, exista una obligación legal o la persona utilice voluntariamente una plataforma externa. Si eliges contactar mediante WhatsApp, la comunicación se realiza a través de ese servicio y queda sujeta también a sus propias condiciones y política de privacidad.</p><h2>Conservación</h2><p>Los datos se conservarán durante el tiempo necesario para atender la consulta o mantener la relación de servicio y, posteriormente, durante los plazos que resulten exigibles para atender obligaciones legales.</p><h2>Tus derechos</h2><p>Puedes solicitar el acceso, rectificación, supresión, oposición, limitación del tratamiento y, cuando corresponda, portabilidad de tus datos. También puedes retirar un consentimiento previamente otorgado sin que ello afecte a la licitud del tratamiento anterior.</p><p>Para ejercer estos derechos puedes contactar en <a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a>. Si consideras que el tratamiento de tus datos no se ajusta a la normativa, puedes presentar una reclamación ante la <a href="https://www.aepd.es/" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p><h2>Decisiones automatizadas</h2><p>Esta web no realiza decisiones automatizadas ni elaboración de perfiles de usuarios.</p>`
  },
  {
    route:'/cookies/',
    title:'Política de cookies | Antenas Abaso',
    description:'Política de cookies de Antenas Abaso: esta versión no utiliza cookies analíticas ni publicitarias y explica el almacenamiento técnico del aviso de privacidad.',
    kicker:'Transparencia web',
    h1:'Política de cookies',
    lead:'La web está diseñada para funcionar sin seguimiento publicitario ni analítica de comportamiento en esta versión.',
    content:`<h2>Qué utiliza actualmente esta web</h2><p>La versión actual de antenasabaso.com no instala cookies de analítica, publicidad, personalización comercial ni seguimiento de usuarios.</p><h2>Almacenamiento técnico del aviso</h2><p>Cuando pulsas “Entendido” en el aviso inferior, el navegador guarda localmente la clave <code>antenas-abaso-cookie-info-v1</code> únicamente para recordar que ya has cerrado ese mensaje. Este dato no identifica al usuario, no se envía a Antenas Abaso y no se utiliza con fines publicitarios o analíticos.</p><h2>Servicios de terceros</h2><p>La web contiene enlaces a servicios externos, por ejemplo WhatsApp. Las cookies o tecnologías que puedan utilizar esos servicios una vez que abandonas antenasabaso.com dependen de sus respectivos proveedores y de sus propias políticas.</p><h2>Cómo gestionar cookies en el navegador</h2><p>Los navegadores permiten consultar, bloquear o eliminar cookies y datos almacenados desde sus opciones de privacidad. La ubicación exacta de estos controles depende del navegador y del dispositivo utilizado.</p><h2>Cambios futuros</h2><p>Si en el futuro se incorporan herramientas de analítica, publicidad u otras tecnologías que requieran consentimiento, esta política y el mecanismo de gestión se actualizarán antes de activarlas.</p>`
  }
];

function renderProvince(province){
  const route=`/${province.slug}/`;
  const title=`Antenistas en ${province.name} | ${PHONE}`;
  const description=`${province.name} · ${PHONE}. ${PHRASE}. Consulta tu municipio.`;
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
  const structured={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:title,url:canonical(route),description},breadcrumbData(province)]};
  return `${head(title,description,route,structured)}<body>${header()}<main class="local-page"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span aria-current="page">${esc(province.name)}</span></nav><section class="province-hero"><div class="wrap"><span class="eyebrow">Servicio por municipios</span><h1>Antenistas en ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p>Selecciona tu municipio para consultar antenas TDT, parabólicas, amplificación, porteros automáticos, videoporteros, cobertura móvil 4G/5G y reparaciones eléctricas.</p><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a></div></section><section class="town-directory"><div class="wrap"><div class="directory-head"><div><span class="eyebrow">Todos los municipios</span><h2>${province.towns.length} municipios de ${esc(province.name)}</h2></div><p>Selecciona una letra para encontrar tu localidad y consultar el servicio.</p></div>${alphabet}${grouped}</div></section><section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>Consulta tu localidad</h2><p>Llámanos e indica tu localidad de ${esc(province.name)}.</p></div><div class="contact-actions"><a class="btn btn-light" href="${tel()}">${PHONE}</a><a class="btn btn-whatsapp-light" href="${wa(`Hola, necesito un servicio en ${province.name}.`)}">WhatsApp</a></div></div></section></main>${footer(province.name)}</body></html>`;
}

fs.rmSync(ROOT,{recursive:true,force:true});
fs.mkdirSync(ROOT,{recursive:true});
fs.copyFileSync(path.resolve('styles.css'),path.join(ROOT,'styles.css'));
fs.copyFileSync(path.resolve('site.js'),path.join(ROOT,'site.js'));
if(fs.existsSync(path.resolve('assets'))) fs.cpSync(path.resolve('assets'),path.join(ROOT,'assets'),{recursive:true});

let home=homeSource;
home=home.replaceAll('href="#bizkaia"','href="/bizkaia/"').replaceAll('href="#gipuzkoa"','href="/gipuzkoa/"').replaceAll('href="#alava"','href="/alava/"');
fs.writeFileSync(path.join(ROOT,'index.html'),home);

// SVG cuadrado y autocontenido, generado desde el logo; sin dependencias remotas.
const favicon=brandSvg
  .replace(/\s(?:aria-hidden|focusable|data-logo)="[^"]*"/g,'')
  .replace('viewBox="0 0 128 120"','viewBox="0 0 128 128" width="128" height="128"')
  .replace(/(<svg\b[^>]*>)/,'$1<title>Antenas Abaso</title><rect width="128" height="128" rx="18" fill="#fff"/>');
fs.writeFileSync(path.join(ROOT,'favicon.svg'),favicon);

const manifest=[];
const routes=new Set(['/']);
for(const province of provinces){
  const provinceDir=path.join(ROOT,province.slug);
  fs.mkdirSync(provinceDir,{recursive:true});
  fs.writeFileSync(path.join(provinceDir,'index.html'),renderProvince(province));
  for(let i=0;i<province.towns.length;i++){
    const town=province.towns[i];
    const slug=slugify(town);
    const route=`/${province.slug}/${slug}/`;
    if(routes.has(route)) throw new Error(`Ruta duplicada: ${route}`);
    routes.add(route);
    const dir=path.join(provinceDir,slug);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),renderTown(province,town,i));
    manifest.push({name:town,province:province.name,provinceSlug:province.slug,slug,path:route});
  }
} 
for(const page of legalPages){
  if(routes.has(page.route)) throw new Error(`Ruta duplicada: ${page.route}`);
  routes.add(page.route);
  const dir=path.join(ROOT,page.route.replace(/^\/+|\/+$/g,''));
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),renderLegalPage(page));
}
fs.writeFileSync(path.join(ROOT,'local-pages-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(ROOT,'preview-manifest.json'),JSON.stringify({mode:'preview',towns:totalTowns,provinces:provinces.map(p=>({name:p.name,count:p.towns.length}))},null,2));
fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nDisallow: /\n`);
fs.writeFileSync(path.join(ROOT,'_headers'),`/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
fs.writeFileSync(path.join(ROOT,'404.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"><title>Página no disponible | Antenas Abaso</title></head><body><main class="wrap section"><h1>Página no disponible</h1><p>Vuelve al inicio o consulta tu localidad por teléfono.</p><a class="btn btn-primary" href="/">Volver al inicio</a></main></body></html>`);

console.log(`BUILD ABASO OK: ${totalTowns} páginas locales + ${provinces.length} provincias + portada, todo en preview noindex.`);
