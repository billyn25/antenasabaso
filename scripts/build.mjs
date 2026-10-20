import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import services from '../content/services.json' with { type: 'json' };
import { provinces, totalTowns } from '../content/municipios.mjs';
import { comarcaFor, townsInComarca } from '../content/comarcas.mjs';
import {guides,guideRoute,extraRoutes,serviceGuideLinks,guideNavigation,enhanceHome,renderGuide,renderGuideIndex,GUIDE_CSS,GUIDE_CSS_PATH} from './service-guides.mjs';

const ROOT = path.resolve('dist');
const DOMAIN = 'https://antenasabaso.com';
const PHONE = '670 042 626';
const TEL = '+34670042626';
const WA = '34670042626';
const PHRASE = 'Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';

// La preview sigue siendo la opción por defecto. SITE_MODE=production se activa
// expresamente el día de la conexión; las previews de rama nunca se indexan.
const requestedMode = process.argv.includes('--production') ? 'production' : (process.env.SITE_MODE || 'preview');
if (!['preview', 'production'].includes(requestedMode)) throw new Error('SITE_MODE debe ser preview o production.');
const previewContext = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT);
const MODE = previewContext ? 'preview' : requestedMode;
const production = MODE === 'production';
const ROBOTS = production ? 'index,follow' : 'noindex,nofollow';
if (!production && !previewContext) {
  for (const value of [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean)) {
    if (new URL(value).hostname.replace(/^www\./, '') === 'antenasabaso.com') {
      throw new Error('Dominio real conectado: activa SITE_MODE=production en Netlify antes de publicar.');
    }
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


const serviceTextVariants = {
  tdt:[
    t=>`En ${t} revisamos antenas TDT individuales y colectivas, nivel de señal, orientación, cableado, repartidores y tomas cuando faltan canales o la imagen se corta.`,
    t=>`Si la TDT falla en ${t}, comprobamos primero si el problema está en recepción, amplificación, distribución o una toma concreta antes de sustituir componentes.`,
    t=>`Para instalaciones TDT de ${t} podemos revisar antena, mástil, conexiones, cableado y reparto de señal tanto en viviendas como en comunidades.`,
    t=>`Una pérdida de señal TDT en ${t} puede venir de varios puntos. La revisión se plantea desde la recepción hasta las tomas para localizar el origen de la incidencia.`
  ],
  'tdt-satelite':[
    t=>`Para viviendas de ${t} donde la recepción terrestre no resulta adecuada, valoramos una instalación de TDT por satélite con antena parabólica y receptor compatible. Se comprueba orientación, señal y cableado antes de configurar el equipo.`,
    t=>`Instalamos antena parabólica y receptor para recepción de TDT por satélite en ${t}. La recepción en alta definición depende de la emisión disponible y de que el receptor sea compatible con HD.`,
    t=>`Si necesitas recibir la TDT por satélite en ${t}, revisamos ubicación de la parabólica, LNB, cableado y receptor para dejar la instalación preparada y comprobar la sintonización.`
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
  ['La avería afecta a una comunidad', t=>`Si la incidencia en ${t} afecta a una comunidad, dinos si ocurre en todas las viviendas o zonas comunes o solo en una parte. Esa diferencia cambia el punto por el que conviene empezar a revisar.`],
  ['Resintonización TDT y canales UHD', t=>`En ${t} podemos realizar búsqueda y resintonización de canales TDT cuando cambian emisiones o faltan servicios. Si el televisor o receptor es compatible, también se comprueba la recepción de emisiones UHD/DVB-T2 antes de atribuir el problema a la antena.`],
  ['Comprobar compatibilidad para TDT UHD', t=>`Si un televisor de ${t} no localiza nuevas emisiones, se puede revisar si admite DVB-T2 y HEVC, además de comprobar la señal disponible. Resintonizar no corrige una incompatibilidad del receptor ni una avería de la instalación.`],
  ['Ordenar canales y eliminar duplicados', t=>`Después de una búsqueda automática en ${t}, podemos ayudar a ordenar canales, eliminar duplicados y comprobar que el televisor conserva correctamente la lista antes de dar por terminada la intervención.`],
  ['Montaje de televisión en soporte de pared', t=>`Para instalar una TV en pared en ${t}, se valora el peso y tamaño del televisor, el tipo de soporte y la pared disponible. También se prepara el recorrido de antena, HDMI y alimentación para evitar cables innecesariamente expuestos.`],
  ['Soporte fijo, inclinable o articulado para TV', t=>`El soporte de una televisión en ${t} se elige según medidas VESA, peso, distancia de visualización y movimiento necesario. Una pared hueca o un brazo articulado requieren una fijación distinta de un soporte fijo sobre muro macizo.`],
  ['Ordenar y canalizar cables detrás del televisor', t=>`En una instalación de TV en ${t} se puede organizar cable de antena, HDMI y alimentación mediante canaleta o recorrido adecuado. Antes de ocultarlos se comprueba longitud, conectores y acceso futuro a los equipos.`],
  ['Montaje de proyector en techo o pared', t=>`Para montar un proyector en ${t} se revisan distancia de proyección, posición de la imagen, soporte, alimentación y recorrido HDMI o de señal. La ubicación se decide antes de perforar para evitar correcciones posteriores.`],
  ['Instalación de pantalla de proyección', t=>`Una pantalla de proyección en ${t} debe colocarse según tamaño, altura y posición del proyector. En modelos motorizados también se valora la alimentación y el recorrido de control cuando corresponda.`],
  ['Cableado HDMI y señal entre equipos', t=>`Si televisor, receptor o proyector están separados en ${t}, se puede preparar el recorrido de HDMI, coaxial u otros cables de señal evitando tiradas improvisadas y comprobando la conexión antes de cerrar canaletas o soportes.`],
  ['Configuración de receptor TDT o satélite', t=>`En ${t} podemos revisar la conexión y configuración básica de receptores TDT o satélite, búsqueda de canales y salida hacia el televisor. Si falta señal, primero se diferencia configuración de problema de recepción.`],
  ['Mover la televisión y preparar un nuevo punto', t=>`Si quieres cambiar una TV de ubicación en ${t}, se revisa si el nuevo punto dispone de señal, alimentación y espacio para el soporte. Cuando hace falta, se valora ampliar la toma y ordenar el cableado.`],
  ['HDMI largo para bar u oficina', t=>`En un bar, oficina o local de ${t} se puede preparar un recorrido HDMI de mayor longitud comprobando distancia, resolución y conexiones antes de cerrar canaletas o fijar equipos.`],
  ['Distribuir una fuente HD a varias televisiones', t=>`Si un establecimiento de ${t} necesita mostrar una misma fuente de vídeo autorizada en varias pantallas, se puede estudiar una distribución mediante modulador COFDM HD y la red coaxial disponible.`],
  ['Mejorar Wi‑Fi con puntos de acceso Reyee', t=>`Cuando la conexión llega bien al router pero hay zonas sin cobertura en ${t}, se puede valorar una red con puntos de acceso Reyee o equivalentes y cableado adecuado.`],
  ['Automatizar una puerta de portal', t=>`En una comunidad de ${t} se puede valorar un motor para la puerta de portal cuando se quiere facilitar el acceso y reducir el esfuerzo de apertura, comprobando antes el estado mecánico y la seguridad del paso.`]
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
  'Un teléfono de contacto y la franja en la que resulta más fácil localizarte.',
  'El modelo del televisor y sus pulgadas si quieres instalarlo en pared.',
  'Si ya dispones del soporte de TV y qué tipo de pared hay en la zona de montaje.',
  'La distancia aproximada entre proyector y pantalla cuando la consulta es audiovisual.',
  'Qué cables necesitas llevar hasta la TV o el proyector: antena, HDMI, red o alimentación.',
  'Si el problema es de resintonización, indica el modelo del televisor o receptor y qué canales faltan.'
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
  [t=>`¿Puedo enviar una foto del equipo antes de la visita?`, t=>`Sí. Una foto de la marca, modelo, placa, monitor, amplificador o router puede ayudar a identificar el sistema y preparar la revisión.`],
  [t=>`¿Resintonizáis canales TDT y UHD en ${t}?`, t=>`Sí. Se puede realizar una nueva búsqueda de canales y comprobar la compatibilidad del televisor o receptor con las emisiones disponibles. Si faltan servicios por un problema de señal, la instalación también debe revisarse.`],
  [t=>`¿Montáis televisores en soporte de pared en ${t}?`, t=>`Sí. Para preparar el montaje conviene indicar pulgadas, peso aproximado, modelo de soporte y tipo de pared, además de cómo quieres resolver antena, HDMI y alimentación.`],
  [t=>`¿Podéis montar un proyector y pantalla en ${t}?`, t=>`Se puede valorar el montaje del proyector y la pantalla según distancia, soporte, alimentación y recorrido de señal. La posición se define antes de fijar los equipos.`],
  [t=>`¿Podéis ordenar el cableado de una TV o proyector en ${t}?`, t=>`Sí, se puede valorar el recorrido de antena, HDMI y otros cables mediante canaleta o la solución adecuada al espacio, manteniendo acceso razonable a conexiones y equipos.`]
];

function selectDistinct(pool,start,count,step=5){
  const out=[];
  for(let i=0;out.length<count&&i<pool.length*2;i++){
    const item=pool[(start+i*step)%pool.length];
    if(!out.includes(item)) out.push(item);
  }
  return out;
}

function rankedLocalSelection(pool,key,count){
  return pool
    .map((item,index)=>({
      item,
      score:createHash('sha256').update(`${key}|${index}`).digest('hex')
    }))
    .sort((a,b)=>a.score.localeCompare(b.score))
    .slice(0,count)
    .map(x=>x.item);
}

const localCoreIntentVariants=localIntentVariants.slice(0,12);
const localAuxiliaryIntentVariants=localIntentVariants.slice(12);

function localIntentSections(town,h){
  const intents=[
    ...rankedLocalSelection(localCoreIntentVariants,`${town}|core-intent|${h}`,2),
    ...rankedLocalSelection(localAuxiliaryIntentVariants,`${town}|aux-intent|${h}`,2)
  ];
  const faqs=rankedLocalSelection(localFaqVariants,`${town}|faq|${h}`,3);
  const intentHtml=`<section class="local-intents"><div class="wrap"><span class="eyebrow">Casos habituales</span><h2>Qué podemos revisar en ${esc(town)}</h2><div class="local-intents-grid">${intents.map(([title,text])=>`<article><h3>${esc(title)}</h3><p>${esc(text(town))}</p></article>`).join('')}</div></div></section>`;
  const faqHtml=`<section class="local-faq"><div class="wrap"><span class="eyebrow">Preguntas frecuentes</span><h2>Antes de pedir servicio en ${esc(town)}</h2><div class="local-faq-list">${faqs.map(([q,a])=>`<details><summary>${esc(q(town))}</summary><p>${esc(a(town))}</p></details>`).join('')}</div></div></section>`;
  return intentHtml+faqHtml;
}

function fitTitle(town, province){
  const candidates = [
    `Antenas y porteros en ${town} | Reparación · ${PHONE}`,
    `Antenas en ${town} | Reparación · ${PHONE}`,
    `Antenas en ${town} | ${PHONE}`
  ];
  // El title complementa al H1 "Antenista en {pueblo}, {provincia}" y amplía intención local.
  return candidates.find(x=>x.length<=70) || candidates[2];
}
function metaDescription(town, province){
  const candidates = [
    `Antenista en ${town}, ${province}. Instalación y reparación de antenas TDT y parabólicas, amplificadores, porteros y videoporteros. ${PHONE}.`,
    `Antenista en ${town}, ${province}. Reparación e instalación de antenas TDT, parabólicas, porteros y videoporteros. ${PHONE}.`,
    `Antenista en ${town}, ${province}. Reparación e instalación de antenas. ${PHONE}.`
  ];
  return candidates.find(x=>x.length<=165) || candidates.at(-1);
}
function brand(){
  return `<a class="brand" href="/" aria-label="Antenas Abaso, inicio"><span class="brand-mark brand-mark-abaso" aria-hidden="true">${brandSvg}</span><span class="brand-copy"><b>ANTENAS</b><strong>ABASO</strong></span></a>`;
}
function header(contactHref='#contacto'){
  return `<a class="skip" href="#contenido">Saltar al contenido</a><div class="topbar"><div class="wrap topbar-inner"><span>Servicio técnico de antenas y porteros</span><div><strong>Urgencias 24h</strong><span class="dot">·</span><a href="${tel()}">${PHONE}</a></div></div></div><header class="site-header"><div class="wrap header-inner">${brand()}<button class="menu-toggle" data-menu-toggle type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="Abrir menú"><span aria-hidden="true">☰</span><span>Menú</span></button><nav class="main-nav" id="site-navigation" aria-label="Navegación principal"><a href="/#servicios">Servicios</a><a href="/#municipios">Municipios</a><a href="/#confianza">Confianza</a><a href="${contactHref}">Contacto</a></nav><a class="header-phone" href="${tel()}"><small>Llámanos ahora</small><strong>${PHONE}</strong></a></div></header>`;
}

function localTrustStrip(town){
  return `<section class="local-trust-strip" aria-label="Datos de servicio en ${esc(town)}"><div class="wrap local-trust-grid"><div><small>Experiencia</small><strong>20 años</strong></div><div><small>Atención</small><strong>Servicio técnico</strong></div><div><small>Urgencias</small><strong>24h</strong></div><div><small>Ámbito</small><strong>${esc(town)}</strong></div></div></section>`;
}

function localTerritory(province,town){
  const comarca=comarcaFor(province.slug,town);
  const title=comarca?`${town} · ${comarca}`:`${town} · ${province.name}`;
  const text=comarca
    ? `${town} pertenece a la comarca ${comarca}, dentro de ${province.name}. Desde aquí puedes consultar el servicio de la localidad y acceder al directorio completo de ${province.towns.length} municipios de ${province.name}.`
    : `Esta página corresponde al servicio técnico en ${town}, ${province.name}. Desde aquí puedes consultar la atención local y acceder al directorio completo de ${province.towns.length} municipios de la provincia.`;
  return `<section class="local-territory"><div class="wrap local-territory-inner"><div><span class="eyebrow">Contexto territorial</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div><a class="province-back" href="/${province.slug}/">Ver municipios de ${esc(province.name)} →</a></div></section>`;
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
  const provinceLinks=provinces.map(p=>`<a href="/${p.slug}/">${esc(p.name)}</a>`).join('');
  return `<footer class="footer"><div class="wrap footer-top"><div class="footer-brand-block"><strong class="footer-brand-name">Antenas Abaso</strong><p>${PHRASE} para viviendas y comunidades.</p><div class="footer-badges"><span>24h urgencias</span><span>20 años de experiencia</span><span>${totalTowns.toLocaleString('es-ES')} municipios</span></div></div><div class="footer-contact-card"><small>Contacto directo</small><a class="footer-phone" href="${tel()}">${PHONE}</a><a class="footer-wa" href="${esc(wa(message))}">WhatsApp</a></div></div><div class="wrap footer-grid footer-grid-rich"><div><strong>Servicios</strong><nav class="footer-links" aria-label="Servicios"><a href="/#servicio-tdt">Antenas TDT</a><a href="/#servicio-parabolicas">Parabólicas</a><a href="/#servicio-tdt-satelite">TDT por satélite</a><a href="/#servicio-porteros">Porteros y videoporteros</a><a href="/#servicio-cobertura-movil">Cobertura 4G/5G</a></nav></div><div><strong>Cobertura</strong><nav class="footer-links footer-provinces" aria-label="Provincias">${provinceLinks}</nav></div><div><strong>Antes de llamar</strong><p class="footer-help">Ten a mano el municipio, tipo de inmueble, qué falla y, si es posible, la marca o una foto visible del equipo.</p><a class="footer-budget-link" href="/#formulario">Preparar presupuesto por WhatsApp →</a></div><div class="footer-legal"><strong>Información legal</strong><nav class="footer-links" aria-label="Información legal"><a href="/aviso-legal/">Aviso legal</a><a href="/privacidad/">Privacidad</a><a href="/cookies/">Cookies</a></nav></div></div><div class="wrap footer-bottom"><span>© Antenas Abaso</span><span>Antenas · Porteros · Videoporteros · Cobertura móvil</span></div></footer>${cookieNotice()}<div class="mobile-bar"><a href="${tel()}">Llamar</a><a href="${esc(wa(message))}">WhatsApp</a></div>`;
}
function head(title,description,route,structured){
  const socialImage=DOMAIN+'/assets/gallery/parabolica-realista.webp';
  const robots=production && ['/aviso-legal/','/privacidad/','/cookies/'].includes(route) ? 'noindex,follow' : ROBOTS;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${esc(canonical(route))}"><link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical(route))}"><meta property="og:type" content="website"><meta property="og:site_name" content="Antenas Abaso"><meta property="og:image" content="${socialImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${socialImage}"><meta name="theme-color" content="#18324a"><link rel="stylesheet" href="/styles.css?v=abaso-20261019c">${['/aviso-legal/','/privacidad/','/cookies/'].includes(route)?'':`<link rel="stylesheet" href="${GUIDE_CSS_PATH}">`}<script src="/site.js" defer></script><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head>`;
}
function serviceCards(town='',h=0){
  return services.map((s,i)=>{
    const variants=serviceTextVariants[s.id]||[];
    const text=town&&variants.length?variants[hash(`${town}|${s.id}`)%variants.length](town):s.text;
    return `<article class="service-card${i===0?' featured':''}" id="servicio-${s.id}"><span class="num">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.name)}${town?' en '+esc(town):''}</h3><p>${esc(text)}</p>${town?`<a class="province-back" href="${esc(wa(`Hola, necesito ${s.name.toLowerCase()} en ${town}. Quería consultar la revisión y las condiciones.`))}">Consultar este servicio →</a>`:''}${serviceGuideLinks(s.id)}</article>`;
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
function localEquipmentShowcase(town){
  const items=[
    {
      key:'fagor',
      kicker:'Antena TDT',
      title:'Fagor Rhombus',
      text:'Antena UHF para recepción terrestre. Cuando aparece en una instalación revisamos señal, orientación, conexiones y distribución antes de plantear cambios.'
    },
    {
      key:'tegui',
      kicker:'Portero automático',
      title:'Tegui · Serie 8 / Línea 2000',
      text:'En porteros Tegui se puede separar la avería por llamada, audio y apertura para comprobar qué parte del sistema necesita intervención.'
    },
    {
      key:'televes',
      kicker:'Amplificación',
      title:'Televes · amplificación de vivienda',
      text:'Amplificadores y elementos de distribución pueden mejorar o repartir señal, pero conviene medir primero para evitar amplificar una señal defectuosa.'
    },
    {
      key:'satelite',
      kicker:'Satélite',
      title:'Parabólica, LNB y cableado',
      text:'En recepción por satélite revisamos fijación, orientación, LNB, conectores y coaxial antes de sustituir componentes.'
    }
  ];
  return `<section class="local-equipment-showcase" aria-labelledby="equipos-${slugify(town)}"><div class="wrap"><div class="local-equipment-head"><div><span class="eyebrow">Equipos que nos encontramos</span><h2 id="equipos-${slugify(town)}">Antenas y equipos que podemos revisar en ${esc(town)}</h2></div><p>Ejemplos habituales de equipos de recepción, amplificación y acceso. La reparación depende del modelo, el estado de la instalación y la compatibilidad disponible.</p></div><div class="local-equipment-grid">${items.map(item=>`<article class="equipment-card equipment-${item.key}"><div class="equipment-photo" role="img" aria-label="${esc(item.title)}"></div><div class="equipment-copy"><span>${esc(item.kicker)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join('')}</div></div></section>`;
}

const localTechnicalTopics = [
  {
    title:'Si faltan los mismos canales en varias televisiones',
    text:t=>`Cuando en ${t} desaparecen los mismos grupos de canales en varias tomas, conviene revisar recepción, cabecera, amplificación y distribución antes de pensar que fallan varios televisores a la vez.`
  },
  {
    title:'Si solo falla una toma de televisión',
    text:t=>`Si en ${t} el resto de televisores funciona, la revisión se puede concentrar en esa derivación: conector, cable coaxial, repartidor o toma final.`
  },
  {
    title:'Después de viento fuerte o temporal',
    text:t=>`Una antena o parabólica de ${t} puede perder orientación o sufrir en fijaciones y conexiones. Antes de sustituirla se comprueban soporte, mástil, orientación, cable y estado visible de la instalación.`
  },
  {
    title:'Cuando el amplificador no es la solución',
    text:t=>`En ${t}, añadir ganancia sin conocer el nivel y la calidad de señal puede empeorar el resultado. Primero se diferencia falta de señal, exceso de amplificación y pérdidas en la distribución.`
  },
  {
    title:'Avería individual o problema comunitario',
    text:t=>`Si el fallo de ${t} también afecta a otros vecinos, el punto de partida cambia: interesa revisar elementos comunes antes de intervenir únicamente dentro de una vivienda.`
  },
  {
    title:'Portero que llama pero no se oye',
    text:t=>`En un portero de ${t}, que la llamada funcione no significa que audio y apertura estén correctos. Separar cada función ayuda a localizar si el problema está en terminal, cableado, placa o alimentación.`
  },
  {
    title:'Portero que falla solo en una vivienda',
    text:t=>`Cuando en ${t} el resto de vecinos conserva el servicio, se revisa primero el terminal y el recorrido hasta esa vivienda antes de atribuir la avería a toda la instalación común.`
  },
  {
    title:'Videoportero con sonido pero sin imagen',
    text:t=>`Si el videoportero de ${t} mantiene llamada y audio pero pierde imagen, se comprueban monitor, cámara, alimentación, conexiones y compatibilidad del sistema existente.`
  },
  {
    title:'Parabólica sin señal o con cortes',
    text:t=>`En ${t} una pérdida de satélite puede venir de orientación, LNB, conectores, entrada de humedad o cable coaxial. La revisión busca aislar el componente antes de cambiar el conjunto.`
  },
  {
    title:'Instalaciones antiguas que aún pueden aprovecharse',
    text:t=>`Una instalación antigua de ${t} no tiene por qué renovarse completa. Se comprueba qué elementos siguen trabajando correctamente y dónde aparecen pérdidas, deterioro o incompatibilidades.`
  },
  {
    title:'Al añadir nuevas tomas de TV',
    text:t=>`Una nueva toma en ${t} modifica el reparto de señal. Antes de ampliar se valora el recorrido, las pérdidas y si la red existente admite otra derivación sin perjudicar las tomas actuales.`
  },
  {
    title:'Mantenimiento antes de que aparezca la avería',
    text:t=>`En instalaciones expuestas de ${t}, una revisión visual de fijaciones, conexiones y cableado puede detectar deterioro antes de que se traduzca en cortes o pérdida de canales.`
  },
  {
    title:'Cobertura móvil: primero saber qué señal existe',
    text:t=>`En una vivienda de ${t}, una antena 4G/5G debe elegirse según operador, bandas, router y señal exterior disponible. No todos los equipos admiten los mismos conectores ni la misma solución.`
  },
  {
    title:'Cuando una avería aparece tras una reforma',
    text:t=>`Si el problema de ${t} comenzó después de mover tomas, cambiar cableado o realizar una obra, ese cambio es una pista útil para revisar conexiones y recorridos antes de tocar la antena principal.`
  },
  {
    title:'Cerradura eléctrica del portero que no abre',
    text:t=>`Si desde el telefonillo de ${t} se oye correctamente pero la puerta no abre, se revisan abrepuertas, alimentación, pulsación, conexiones y estado mecánico antes de culpar al telefonillo.`
  },
  {
    title:'La puerta no cierra bien por holgura',
    text:t=>`En ${t}, una cerradura eléctrica puede funcionar y aun así no cerrar bien si puerta, pestillo o marco están desalineados. Conviene distinguir un fallo eléctrico de una holgura o ajuste mecánico.`
  },
  {
    title:'El abrepuertas funciona unas veces sí y otras no',
    text:t=>`Una apertura intermitente en ${t} puede estar relacionada con contactos, alimentación, pulsador, cableado o ajuste del cerradero. El síntoma ayuda a evitar cambiar piezas sin localizar la causa.`
  },
  {
    title:'Antena TDT dañada por tormenta',
    text:t=>`Después de una tormenta en ${t} se comprueban antena, mástil, fijaciones, orientación, conexiones y alimentación. Viento, agua o un movimiento del conjunto pueden provocar pérdidas de señal aunque el televisor siga funcionando.`
  },
  {
    title:'Agua o humedad en conectores de antena',
    text:t=>`Si la señal de ${t} empeora después de lluvia, interesa revisar conectores exteriores, cajas y tramos de coaxial expuestos. La humedad puede introducir pérdidas e inestabilidad sin que la antena esté rota.`
  },
  {
    title:'Mástil o soporte con movimiento',
    text:t=>`Una fijación floja en ${t} puede hacer que la antena cambie ligeramente de orientación con el viento. Se revisa soporte y estabilidad antes de reajustar o sustituir la antena.`
  },
  {
    title:'Wi‑Fi débil no siempre es mala cobertura móvil',
    text:t=>`Si en una vivienda de ${t} el problema es solo dentro de casa, conviene diferenciar la cobertura Wi‑Fi del router de la señal 4G/5G del operador. Son problemas distintos y requieren comprobaciones diferentes.`
  },
  {
    title:'Tras cambiar el router empeora la señal',
    text:t=>`Si en ${t} la cobertura o los datos empeoran después de cambiar de router, se revisan ubicación, bandas, conectores y compatibilidad con antena exterior antes de instalar otro equipo.`
  },
  {
    title:'Tras cambiar de televisor faltan canales',
    text:t=>`Si una toma de ${t} funcionaba y el problema aparece al cambiar de televisor, se compara esa toma con otras y se revisan sintonización, nivel de señal y conexión antes de modificar la instalación común.`
  },
  {
    title:'Cable coaxial cuarteado con entrada de agua',
    text:t=>`En instalaciones exteriores de ${t}, un coaxial envejecido o cuarteado puede permitir entrada de humedad. Se revisan tramos expuestos, conectores y cajas porque el agua puede provocar pérdidas e inestabilidad de señal.`
  },
  {
    title:'Señal recibida desde más de un centro emisor',
    text:t=>`En algunas ubicaciones de ${t} pueden llegar señales por recorridos o centros emisores distintos. Si aparecen ecos, cortes o recepción inestable, se valora orientación, nivel y distribución antes de añadir amplificación.`
  },
  {
    title:'Zona de sombra para la TDT terrestre',
    text:t=>`Si en una zona de ${t} la cobertura terrestre resulta insuficiente incluso con la instalación revisada, puede valorarse una solución de recepción por satélite cuando el servicio y las condiciones disponibles encajen con la vivienda.`
  },
  {
    title:'Receptor preparado para futuras emisiones UHD',
    text:t=>`Si se renueva un receptor en ${t}, conviene comprobar qué formatos admite para no quedarse limitado ante futuras emisiones. La disponibilidad real de UHD depende de las emisiones y del equipo compatible en cada momento.`
  },
  {
    title:'Torreta o mástil para ganar despeje',
    text:t=>`En comunidades de ${t}, cuando edificios, arbolado o relieve dificultan la recepción, se puede valorar ganar altura con mástil o torreta si la medición confirma que mejora el despeje. La fijación, estabilidad y seguridad de la estructura forman parte de la solución.`
  },
  {
    title:'Antenas de radio FM y DAB/DAB+',
    text:t=>`En ${t} también se pueden revisar o instalar antenas específicas para radio FM y DAB/DAB+. La orientación, el tipo de antena y la distribución se valoran aparte de la TDT para evitar pérdidas o una recepción deficiente.`
  },
  {
    title:'Radio FM o DAB con señal débil en comunidad',
    text:t=>`Si una comunidad de ${t} quiere distribuir radio FM o DAB/DAB+, se revisa la captación exterior, el mástil disponible, la amplificación y cómo integrar esa señal en la red sin perjudicar los servicios de televisión.`
  },
  {
    title:'Mástil caído, doblado o desplazado',
    text:t=>`Si en ${t} un temporal ha movido o doblado el mástil, se revisan anclajes, orientación, verticalidad, tensores y estado de la estructura antes de reajustar la recepción.`
  },
  {
    title:'Previo de mástil sulfatado',
    text:t=>`Un previo de mástil sulfatado en ${t} puede provocar pérdidas, cortes o fallos intermitentes. Se comprueban alimentación, conectores y estado del equipo antes de sustituir la antena.`
  },
  {
    title:'Amplificador exterior mojado o con humedad',
    text:t=>`Cuando la instalación de ${t} empeora con lluvia, se revisan caja, amplificador exterior, conectores y coaxial. El agua puede degradar la señal aunque la antena siga correctamente orientada.`
  },
  {
    title:'Revisión de amplificación y cabecera comunitaria',
    text:t=>`Si varias viviendas de ${t} pierden los mismos canales, se revisan central, módulos, fuentes y niveles de entrada y salida antes de intervenir toma por toma.`
  },
  {
    title:'Cambio de toma de TV de pared',
    text:t=>`Una toma de televisión deteriorada en ${t} puede introducir pérdidas o falsos contactos. Se comprueban mecanismo, conexión y cable antes de sustituirla o crear una nueva derivación.`
  },
  {
    title:'Cable HDMI largo para bar, oficina o local',
    text:t=>`En un bar, oficina o local de ${t} se puede preparar un recorrido HDMI de mayor longitud con la solución adecuada a la distancia, comprobando resolución, conectores y recorrido antes de cerrar canaletas.`
  },
  {
    title:'Modulador COFDM HD para varias televisiones',
    text:t=>`Si un establecimiento de ${t} necesita repartir una misma fuente de vídeo autorizada entre varias televisiones, se puede estudiar un modulador COFDM HD aprovechando la red coaxial disponible.`
  },
  {
    title:'Cobertura Wi‑Fi con puntos de acceso Reyee',
    text:t=>`Cuando en ${t} la conexión de entrada es correcta pero el Wi‑Fi no cubre toda la vivienda o negocio, se puede estudiar una red con puntos de acceso Reyee o equipos equivalentes y cableado adecuado.`
  },
  {
    title:'Cambio de cerradura eléctrica o abrepuertas',
    text:t=>`Si el portero de ${t} funciona pero la puerta no abre correctamente, se puede revisar y sustituir el cerradero o la cerradura eléctrica cuando la avería está en el mecanismo de apertura.`
  },
  {
    title:'Motor para puerta de portal y accesibilidad',
    text:t=>`En comunidades de ${t} se puede valorar la motorización de la puerta de portal para facilitar el acceso de personas con movilidad reducida, revisando peso, recorrido, maniobra y elementos de seguridad.`
  },
  {
    title:'Elegir antena pasiva o con dipolo activo',
    text:t=>`En ${t} no se instala la misma antena en todos los casos. Según nivel, calidad y margen de señal se elige una antena pasiva —sin dipolo activo— o un modelo con dipolo activo cuando la instalación y la alimentación lo justifican.`
  },
  {
    title:'Antena directiva para reducir rebotes e interferencias',
    text:t=>`Si en ${t} llegan señales por varios recorridos o repetidores, una antena más directiva puede ayudar a discriminar direcciones no deseadas. La elección se basa en medición, orientación y calidad, no solo en ganancia nominal.`
  },
  {
    title:'Rechazo LTE/5G en la recepción TDT',
    text:t=>`En una instalación de ${t} expuesta a señales móviles intensas se valora antena con filtrado integrado o filtro LTE/5G adecuado, comprobando antes si existe realmente interferencia y qué margen tiene la TDT.`
  },
  {
    title:'Diplexores para mezclar TDT y satélite',
    text:t=>`Cuando en ${t} interesa aprovechar un mismo coaxial para TDT y satélite, se puede estudiar una combinación mediante diplexores compatibles, respetando paso de corriente, frecuencias y equipos existentes.`
  },
  {
    title:'Cable coaxial negro de polietileno para exterior',
    text:t=>`En recorridos exteriores de ${t} conviene usar coaxial preparado para intemperie, por ejemplo cubierta negra de polietileno, para mejorar resistencia frente a sol, humedad y envejecimiento respecto a cable interior expuesto.`
  },
  {
    title:'Conectores blindados y terminaciones protegidas',
    text:t=>`Una instalación exterior de ${t} también depende de cómo se terminan los cables. Se emplean conectores blindados y terminaciones protegidas cuando corresponde, evitando falsos contactos, entrada de humedad y pérdidas innecesarias.`
  },
  {
    title:'Ajuste con medidor de campo profesional Promax',
    text:t=>`La elección y orientación de antena en ${t} se comprueba con medidor de campo profesional Promax, observando nivel, calidad y margen de recepción antes de dar por terminado el ajuste.`
  },
  {
    title:'Garantía del trabajo y material instalado',
    text:t=>`En trabajos realizados en ${t}, la garantía se concreta sobre la intervención y los materiales instalados según las condiciones del presupuesto y la garantía aplicable de cada fabricante.`
  }
];

const localDecisionTopics = [
  {
    title:'Reparar antes que sustituir',
    text:t=>`En ${t} no damos por hecho que un equipo antiguo deba cambiarse entero. Si la avería está localizada y existe una reparación razonable, se valora esa opción antes de renovar el sistema completo.`
  },
  {
    title:'Qué cambia en una comunidad',
    text:t=>`En una comunidad de ${t}, saber si el fallo afecta a un piso, una planta o varios vecinos permite separar la red común de la distribución interior de cada vivienda.`
  },
  {
    title:'Una foto puede ahorrar comprobaciones previas',
    text:t=>`Una imagen clara de la placa, monitor, amplificador, receptor o router instalado en ${t} puede ayudar a identificar marca y sistema antes de organizar la revisión, sin desmontar tapas.`
  },
  {
    title:'No todos los síntomas apuntan a la antena',
    text:t=>`Una televisión sin canales en ${t} también puede tener un problema de toma, conector, cable, alimentación o distribución. Por eso se sigue el recorrido de la señal antes de decidir qué elemento intervenir.`
  },
  {
    title:'Comprobar antes de comprar recambios',
    text:t=>`Antes de comprar un telefonillo, monitor o amplificador para una instalación de ${t}, conviene confirmar compatibilidad y origen de la avería para evitar un recambio que no resuelva el problema.`
  },
  {
    title:'El síntoma ayuda a preparar la visita',
    text:t=>`Indicar si el fallo de ${t} es continuo, intermitente, aparece con lluvia o afecta a varios equipos ayuda a decidir qué partes de la instalación conviene revisar primero.`
  }
];

function stableTopicSelection(pool,seed,count,step){
  const out=[];
  for(let i=0;out.length<count && i<pool.length*3;i++){
    const item=pool[(seed+i*step)%pool.length];
    if(!out.includes(item)) out.push(item);
  }
  return out;
}

const localTechnicalProfiles = [
  {
    key:'tdt-tiempo',
    eyebrow:'Señal y meteorología',
    title:t=>`Qué revisar en ${t} si la TDT falla después de mal tiempo`,
    intro:'Viento, lluvia y humedad pueden afectar a una instalación exterior de formas distintas. Conviene separar orientación, fijación, conexiones y calidad de señal antes de cambiar la antena.',
    topicIndexes:[2,17,18,19,23,27]
  },
  {
    key:'comunidad',
    eyebrow:'Vivienda o comunidad',
    title:t=>`Cómo cambia la revisión comunitaria en ${t}`,
    intro:'Cuando una avería afecta a más de una vivienda, el recorrido de diagnóstico cambia. Se diferencia la red común de la distribución particular antes de intervenir dentro de un piso.',
    topicIndexes:[4,3,1,10,27,9]
  },
  {
    key:'accesos',
    eyebrow:'Porteros y cierre eléctrico',
    title:t=>`Averías de portero y cerradura eléctrica en ${t}`,
    intro:'Llamada, audio, apertura y ajuste mecánico de la puerta son funciones diferentes. Revisarlas por separado evita sustituir un telefonillo cuando el problema está en otro punto.',
    topicIndexes:[5,6,7,14,15,16]
  },
  {
    key:'satelite',
    eyebrow:'Parabólica y satélite',
    title:t=>`Pérdidas de señal por satélite en ${t}`,
    intro:'Una parabólica sin señal no implica necesariamente cambiar el conjunto. Orientación, LNB, conectores, coaxial y soporte se pueden comprobar por separado.',
    topicIndexes:[8,2,18,19,25,26]
  },
  {
    key:'conectividad',
    eyebrow:'Wi‑Fi, router y cobertura móvil',
    title:t=>`Antes de instalar una antena 4G/5G en ${t}`,
    intro:'Una mala conexión dentro de casa puede venir del Wi‑Fi, del router o de la cobertura del operador. Distinguirlos evita aplicar una solución de cobertura móvil a un problema de red interior.',
    topicIndexes:[12,20,21,13,11]
  },
  {
    key:'distribucion',
    eyebrow:'Cableado y distribución',
    title:t=>`Cuando unas tomas funcionan y otras no en ${t}`,
    intro:'Repartidores, derivaciones, conectores y cable coaxial pueden producir diferencias entre habitaciones. La revisión se centra en el recorrido real de la señal antes de aumentar amplificación.',
    topicIndexes:[1,3,10,13,23,24]
  },
  {
    key:'antigua',
    eyebrow:'Instalaciones antiguas',
    title:t=>`Qué merece la pena conservar en una instalación de ${t}`,
    intro:'Una instalación con años puede tener partes perfectamente aprovechables. Se trata de localizar qué elemento introduce la avería o la incompatibilidad antes de renovar todo el sistema.',
    topicIndexes:[9,11,3,14,5,1]
  },
  {
    key:'intermitentes',
    eyebrow:'Fallos intermitentes',
    title:t=>`Averías que aparecen y desaparecen en ${t}`,
    intro:'Los fallos intermitentes suelen necesitar más contexto: cuándo aparecen, con qué equipo y si coinciden con lluvia, uso del abrepuertas o cambios de carga. Esas pistas ayudan a acotar la revisión.',
    topicIndexes:[16,18,2,3,7,21]
  },
  {
    key:'recepcion-compleja',
    eyebrow:'Recepción complicada',
    title:t=>`Cuando en ${t} llegan señales por más de un recorrido`,
    intro:'No siempre más señal significa mejor recepción. Cuando llegan señales con niveles o recorridos distintos, la orientación y el equilibrio de la instalación importan tanto como la potencia.',
    topicIndexes:[24,3,27,0,23]
  },
  {
    key:'sombra-satelite',
    eyebrow:'Zonas con poca cobertura terrestre',
    title:t=>`Alternativas cuando la TDT terrestre no llega bien a ${t}`,
    intro:'Primero se comprueba que la instalación terrestre esté correcta. Si la cobertura disponible sigue siendo insuficiente, se puede valorar recepción por satélite y la compatibilidad del receptor.',
    topicIndexes:[25,26,27,8,18]
  },
  {
    key:'radio-fm-dab',
    eyebrow:'Radio FM y DAB/DAB+',
    title:t=>`Recepción de radio FM y DAB/DAB+ en ${t}`,
    intro:'La radio terrestre tiene necesidades de captación distintas de la televisión. Se valora antena, orientación, mástil, amplificación y distribución según la instalación existente.',
    topicIndexes:[28,29,27,9,11]
  },
  {
    key:'estructura-humedad',
    eyebrow:'Exterior, mástil y humedad',
    title:t=>`Mástil, previo y elementos exteriores en ${t}`,
    intro:'Los fallos exteriores pueden ser mecánicos o eléctricos. Se revisan estructura, conexiones, humedad y alimentación antes de decidir qué componente necesita intervención.',
    topicIndexes:[30,31,32,17,18,19,23]
  },
  {
    key:'cabecera-tomas',
    eyebrow:'Cabecera y red interior',
    title:t=>`Amplificación, cabecera y tomas de TV en ${t}`,
    intro:'Cuando el problema afecta a varios televisores o a una toma concreta, se separa la red común de la instalación interior y se mide antes de sustituir equipos.',
    topicIndexes:[33,34,0,1,3,10]
  },
  {
    key:'audiovisual-locales',
    eyebrow:'Bares, oficinas y audiovisuales',
    title:t=>`HDMI y distribución de vídeo en locales de ${t}`,
    intro:'En instalaciones audiovisuales se estudian distancia, resolución y red disponible para evitar recorridos improvisados y elegir entre HDMI directo o distribución por coaxial.',
    topicIndexes:[35,36,10,23,27]
  },
  {
    key:'wifi-profesional',
    eyebrow:'Wi‑Fi interior',
    title:t=>`Cobertura Wi‑Fi con puntos de acceso en ${t}`,
    intro:'Una mala cobertura Wi‑Fi interior se separa primero de la señal del operador. Después se valora ubicación, cableado y puntos de acceso según las zonas que necesitan servicio.',
    topicIndexes:[37,20,21,12]
  },
  {
    key:'accesos-motorizados',
    eyebrow:'Portero, cerradura y accesibilidad',
    title:t=>`Apertura y automatización de accesos en ${t}`,
    intro:'El sistema de acceso puede combinar portero, cerradero eléctrico y elementos mecánicos. En determinados portales también se puede valorar motorización para mejorar la accesibilidad.',
    topicIndexes:[38,39,14,15,16,5,7]
  },
  {
    key:'seleccion-antena-medicion',
    eyebrow:'Antena, filtrado y medida',
    title:t=>`Cómo elegimos y ajustamos la antena TDT en ${t}`,
    intro:'La antena se elige por la señal real de la instalación: nivel, calidad, dirección de llegada, interferencias, pérdidas del cableado y servicios que deben convivir. La medición decide si conviene una antena pasiva, dipolo activo, mayor directividad o filtrado.',
    topicIndexes:[40,41,42,46,43,44,45,47]
  },
  {
    key:'cableado-exterior-sat',
    eyebrow:'Cableado exterior y mezcla TDT/SAT',
    title:t=>`Cableado, conectores y mezcla de señales en ${t}`,
    intro:'En exterior importa tanto la captación como el recorrido hasta los equipos. Cable adecuado, conectores protegidos y diplexores bien elegidos evitan pérdidas y permiten integrar TDT y satélite cuando la instalación lo requiere.',
    topicIndexes:[43,44,45,46,40,42,47]
  }
];

function localTechnicalNotes(town,province,h,index){
  const profileSeed=hash(`${province.slug}|${town}|${index}|technical-profile`);
  const profile=localTechnicalProfiles[profileSeed%localTechnicalProfiles.length];
  const count=2+((profileSeed>>>6)%3);
  const start=(profileSeed>>>11)%profile.topicIndexes.length;
  const topics=[];
  for(let i=0;topics.length<count && i<profile.topicIndexes.length*2;i++){
    const topic=localTechnicalTopics[profile.topicIndexes[(start+i*2)%profile.topicIndexes.length]];
    if(topic&&!topics.includes(topic)) topics.push(topic);
  }
  const decisionSeed=hash(`${town}|${province.slug}|decision|${index}`);
  const decision=localDecisionTopics[decisionSeed%localDecisionTopics.length];
  return `<section class="local-technical-notes" data-technical-profile="${profile.key}"><div class="wrap"><div class="local-technical-head"><div><span class="eyebrow">${esc(profile.eyebrow)}</span><h2>${esc(profile.title(town))}</h2></div><p>${esc(profile.intro)}</p></div><div class="local-technical-grid local-technical-grid-${topics.length}">${topics.map(item=>`<article><h3>${esc(item.title)}</h3><p>${esc(item.text(town))}</p></article>`).join('')}</div><aside class="local-decision-note"><strong>${esc(decision.title)}</strong><span>${esc(decision.text(town))}</span></aside></div></section>`;
}

function localBudgetForm(province,town){
  return `<section class="section contact-section local-budget-section" id="contacto"><div class="wrap budget-panel budget-panel-local"><div class="budget-copy"><span class="eyebrow light">Presupuesto por WhatsApp</span><h2>Consulta el servicio en ${esc(town)}</h2><p>La provincia y el municipio ya están preparados. Elige el servicio, cuéntanos qué ocurre y se abrirá WhatsApp con el mensaje listo.</p><a class="budget-phone" href="${tel()}"><small>¿Prefieres llamar?</small><strong>${PHONE}</strong></a></div><form class="budget-form" data-budget-form><input type="hidden" name="province" value="${esc(province.name)}"><input type="hidden" name="town" value="${esc(town)}"><div class="budget-form-grid budget-form-grid-local"><label><span>Servicio</span><select name="service" required><option value="Antenas TDT">Antenas TDT</option><option value="Antenas parabólicas">Antenas parabólicas</option><option value="TDT por satélite HD">TDT por satélite HD</option><option value="Amplificación y distribución">Amplificación y distribución</option><option value="Portero automático">Portero automático</option><option value="Videoportero">Videoportero</option><option value="Cobertura móvil 4G/5G">Cobertura móvil 4G/5G</option><option value="Reparación eléctrica">Reparación eléctrica</option><option value="Resintonización TDT y UHD">Resintonización TDT y UHD</option><option value="Montaje de TV en pared">Montaje de TV en pared</option><option value="Montaje de proyector y pantalla">Montaje de proyector y pantalla</option><option value="Cableado HDMI y audiovisual">Cableado HDMI y audiovisual</option><option value="Configuración de receptor TDT/SAT">Configuración de receptor TDT/SAT</option><option value="HDMI largo para bar u oficina">HDMI largo para bar u oficina</option><option value="Distribución COFDM HD">Distribución COFDM HD</option><option value="Wi-Fi con puntos de acceso">Wi-Fi con puntos de acceso</option><option value="Cerradura eléctrica de portero">Cerradura eléctrica de portero</option><option value="Motor para puerta de portal">Motor para puerta de portal</option></select></label><label><span>Tipo de inmueble</span><select name="property"><option value="Vivienda">Vivienda</option><option value="Comunidad de vecinos">Comunidad de vecinos</option><option value="Comercio o negocio">Comercio o negocio</option><option value="Otro">Otro</option></select></label></div><label class="budget-problem"><span>¿Qué ocurre?</span><textarea name="problem" rows="4" maxlength="600" placeholder="Ej. La antena perdió señal después de viento fuerte; el portero llama pero la cerradura no abre..." required></textarea></label><div class="budget-form-footer"><p>Puedes adjuntar una foto del equipo al abrir WhatsApp.</p><button class="btn btn-whatsapp-light budget-submit" type="submit">Preparar consulta →</button></div></form></div></section>`;
}

function renderTown(province,town,index){
  const townSlug=slugify(town);
  const route=`/${province.slug}/${townSlug}/`;
  const title=fitTitle(town,province.name);
  const description=metaDescription(town,province.name);
  const h=hash(`${province.slug}|${town}`);
  const comarcaPeers=townsInComarca(province.slug,town).filter(x=>x!==town);
  const pool=(comarcaPeers.length?comarcaPeers:province.towns.filter(x=>x!==town)).slice().sort((a,b)=>a.localeCompare(b,'es'));
  const related=Array.from({length:Math.min(6,pool.length)},(_,i)=>pool[(h+i)%pool.length]);
  return `${head(title,description,route,localStructured(title,description,route,town,province))}<body>${header()}<main class="local-page" id="contenido"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><a href="/${province.slug}/">${esc(province.name)}</a><span>/</span><span aria-current="page">${esc(town)}</span></nav><section class="local-hero"><div class="wrap local-hero-grid"><div><span class="eyebrow">Servicio técnico en ${esc(town)}</span><h1>Antenista en ${esc(town)}, ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p class="local-lead">${esc(introVariants[h%introVariants.length](town,province.name))}</p><div class="hero-actions"><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a><a class="btn btn-whatsapp" href="${wa(`Hola, necesito un servicio en ${town}.`)}">WhatsApp</a></div></div><aside class="local-contact"><small>Consulta directa</small><strong>${PHONE}</strong><p>Indica ${esc(town)} y qué problema presenta la instalación.</p><a href="${tel()}">Llamar ahora →</a></aside></div></section>${localTrustStrip(town)}${localEquipmentShowcase(town)}<section class="section services"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Servicios en ${esc(town)}</span><h2>Antenas, porteros y otros servicios en ${esc(town)}</h2></div><p>${esc(adviceVariants[(h>>>7)%adviceVariants.length](town))}</p></div><div class="service-grid">${serviceCards(town,h)}</div></div></section>${localTerritory(province,town)}${localProcess(town,h)}${localTechnicalNotes(town,province,h,index)}${localPrep(town)}${localBrands(town)}${localIntentSections(town,h)}<section class="local-related"><div class="wrap"><span class="eyebrow">Más localidades</span><h2>Otros municipios de ${esc(comarcaFor(province.slug,town)||province.name)}</h2><div class="related-grid">${related.map(x=>`<a href="/${province.slug}/${slugify(x)}/">Antenista en ${esc(x)} →</a>`).join('')}</div><a class="province-back" href="/${province.slug}/">Ver los ${province.towns.length} municipios de ${esc(province.name)} →</a></div></section>${localBudgetForm(province,town)}</main>${footer(town)}</body></html>`;
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
  return `${head(title,description,route,legalStructured(title,description,route))}<body>${header('/#contacto')}<main class="legal-page" id="contenido"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span aria-current="page">${esc(h1)}</span></nav><section class="legal-hero"><div class="wrap"><span class="eyebrow">${esc(kicker)}</span><h1>${esc(h1)}</h1><p>${esc(lead)}</p></div></section><section class="legal-content"><div class="wrap legal-layout"><article class="legal-copy">${content}<p class="legal-update">Última actualización: 23 de septiembre de 2026.</p></article>${legalAside(route)}</div></section></main>${footer()}</body></html>`;
}

const legalPages=[
  {
    route:'/aviso-legal/',
    title:'Aviso legal | Antenas Abaso',
    description:'Aviso legal de Antenas Abaso, titular de antenasabaso.com: datos de contacto, condiciones de uso, propiedad intelectual y legislación aplicable.',
    kicker:'Información del titular',
    h1:'Aviso legal',
    lead:'Información identificativa y condiciones generales de uso de antenasabaso.com.',
    content:`<h2>Datos identificativos</h2><p>Esta página reúne los datos identificativos publicados por Antenas Abaso y las condiciones de uso del sitio web.</p><dl class="legal-data"><div><dt>Titular</dt><dd>ANTENAS ABASO</dd></div><div><dt>Actividad</dt><dd>Instalación, reparación y mantenimiento de telecomunicaciones, antenas, porteros, videoporteros y pequeñas reparaciones eléctricas.</dd></div><div><dt>Localidad publicada</dt><dd>48010 Bilbao, Bizkaia</dd></div><div><dt>Teléfono</dt><dd><a href="${tel()}">${PHONE}</a></dd></div><div><dt>Correo electrónico</dt><dd><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></dd></div><div><dt>Web</dt><dd>www.antenasabaso.com</dd></div></dl><h2>Objeto del sitio web</h2><p>El objetivo de esta web es informar sobre los servicios de Antenas Abaso y facilitar el contacto de personas interesadas en una instalación, reparación, mantenimiento o consulta técnica.</p><h2>Condiciones de uso</h2><p>El acceso a la web implica un uso responsable y conforme a la legislación vigente. El usuario se compromete a no utilizar el sitio, sus contenidos o sus enlaces con fines ilícitos o que puedan perjudicar a terceros.</p><h2>Propiedad intelectual e industrial</h2><p>Los textos, diseño, elementos gráficos, logotipo y demás contenidos propios de esta web están protegidos por la normativa aplicable. No se autoriza su reproducción o explotación fuera de los usos permitidos legalmente sin autorización del titular.</p><h2>Contenido y enlaces externos</h2><p>Antenas Abaso procura mantener la información actualizada y útil. Los enlaces a servicios de terceros, como WhatsApp, se facilitan para mejorar el contacto y quedan sujetos a las condiciones y políticas de esos terceros.</p><h2>Responsabilidad</h2><p>No se garantiza la ausencia absoluta de interrupciones o errores técnicos. La información del sitio es de carácter general y no sustituye la revisión técnica de una instalación concreta.</p><h2>Legislación aplicable</h2><p>Las relaciones derivadas del uso de esta web se rigen por la legislación española, sin perjuicio de los derechos que correspondan a consumidores y usuarios.</p>`
  },
  {
    route:'/privacidad/',
    title:'Política de privacidad | Antenas Abaso',
    description:'Política de privacidad de Antenas Abaso: qué datos se tratan al contactar, para qué se utilizan, conservación, destinatarios y derechos de las personas.',
    kicker:'Protección de datos',
    h1:'Política de privacidad',
    lead:'Explicamos de forma clara qué ocurre con la información que facilitas cuando contactas con Antenas Abaso.',
    content:`<h2>Responsable del tratamiento</h2><dl class="legal-data"><div><dt>Responsable</dt><dd>ANTENAS ABASO</dd></div><div><dt>Localidad publicada</dt><dd>48010 Bilbao, Bizkaia</dd></div><div><dt>Correo electrónico</dt><dd><a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a></dd></div><div><dt>Teléfono</dt><dd><a href="${tel()}">${PHONE}</a></dd></div></dl><h2>Datos técnicos de navegación</h2><p>El alojamiento recibe la dirección IP y datos técnicos de la solicitud para entregar las páginas y mantener la seguridad del servicio. Esto es distinto de la analítica publicitaria; esta web no carga herramientas de seguimiento. La gestión técnica puede requerir proveedores de alojamiento y comunicaciones.</p><h2>Qué datos podemos tratar</h2><p>Esta web no incluye actualmente un formulario de contacto. Si decides contactar por teléfono, correo electrónico o WhatsApp, podremos tratar los datos que facilites voluntariamente, como nombre, teléfono, dirección o localidad, datos de contacto y la información necesaria para entender el servicio solicitado.</p><h2>Para qué utilizamos los datos</h2><ul><li>Responder a consultas y solicitudes de presupuesto.</li><li>Organizar visitas, instalaciones, reparaciones y servicios solicitados.</li><li>Mantener las comunicaciones necesarias durante la prestación del servicio.</li><li>Cumplir obligaciones administrativas, contables o legales cuando corresponda.</li></ul><h2>Base jurídica</h2><p>El tratamiento puede basarse en la aplicación de medidas solicitadas por la persona interesada antes de contratar, en la ejecución de una relación contractual, en obligaciones legales y en el interés legítimo de mantener la seguridad y disponibilidad del sitio. Las finalidades opcionales que lo requieran se basarán en el consentimiento.</p><h2>Destinatarios</h2><p>No se ceden datos a terceros salvo cuando resulte necesario para prestar un servicio, exista una obligación legal o la persona utilice voluntariamente una plataforma externa. Si eliges contactar mediante WhatsApp, la comunicación se realiza a través de ese servicio y queda sujeta también a sus propias condiciones y política de privacidad.</p><h2>Conservación</h2><p>Los datos se conservarán durante el tiempo necesario para atender la consulta o mantener la relación de servicio y, posteriormente, durante los plazos que resulten exigibles para atender obligaciones legales.</p><h2>Tus derechos</h2><p>Puedes solicitar el acceso, rectificación, supresión, oposición, limitación del tratamiento y, cuando corresponda, portabilidad de tus datos. También puedes retirar un consentimiento previamente otorgado sin que ello afecte a la licitud del tratamiento anterior.</p><p>Para ejercer estos derechos puedes contactar en <a href="mailto:info@antenasabaso.com">info@antenasabaso.com</a>. Si consideras que el tratamiento de tus datos no se ajusta a la normativa, puedes presentar una reclamación ante la <a href="https://www.aepd.es/" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p><h2>Decisiones automatizadas</h2><p>Esta web no realiza decisiones automatizadas ni elaboración de perfiles de usuarios.</p>`
  },
  {
    route:'/cookies/',
    title:'Política de cookies | Antenas Abaso',
    description:'Política de cookies de Antenas Abaso: esta versión no utiliza cookies analíticas ni publicitarias y explica el almacenamiento técnico del aviso de privacidad.',
    kicker:'Transparencia web',
    h1:'Política de cookies',
    lead:'La web está diseñada para funcionar sin seguimiento publicitario ni analítica de comportamiento en esta versión.',
    content:`<h2>Qué utiliza actualmente esta web</h2><p>La versión actual de antenasabaso.com no instala cookies de analítica, publicidad, personalización comercial ni seguimiento de usuarios.</p><h2>Almacenamiento técnico del aviso</h2><p>Cuando pulsas “Entendido” en el aviso inferior, el navegador guarda localmente la clave <code>antenas-abaso-cookie-info-v1</code> únicamente para recordar que ya has cerrado ese mensaje. La preferencia permanece hasta que elimines los datos del sitio en el navegador. No es un identificador individual, no se envía a Antenas Abaso y no se utiliza con fines publicitarios o analíticos.</p><h2>Servicios de terceros</h2><p>La web contiene enlaces a servicios externos, por ejemplo WhatsApp. Las cookies o tecnologías que puedan utilizar esos servicios una vez que abandonas antenasabaso.com dependen de sus respectivos proveedores y de sus propias políticas.</p><h2>Cómo gestionar cookies en el navegador</h2><p>Los navegadores permiten consultar, bloquear o eliminar cookies y datos almacenados desde sus opciones de privacidad. La ubicación exacta de estos controles depende del navegador y del dispositivo utilizado.</p><h2>Cambios futuros</h2><p>Si en el futuro se incorporan herramientas de analítica, publicidad u otras tecnologías que requieran consentimiento, esta política y el mecanismo de gestión se actualizarán antes de activarlas.</p>`
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
  const grouped=`${[...groups].map(([letter,towns])=>`<section class="alpha-group" id="letra-${letter}"><h3>${letter}</h3><div class="town-directory-grid">${towns.map(t=>`<a href="/${province.slug}/${slugify(t)}/">Antenista en ${esc(t)} <span>→</span></a>`).join('')}</div></section>`).join('')}`;
  // Accesos rápidos visibles: no sustituyen el directorio completo ni crean URLs nuevas.
  const quickTowns=spreadTowns(province,12);
  const quickAccess=`<section class="province-quick-links" aria-label="Accesos rápidos a municipios de ${esc(province.name)}"><div class="wrap"><h2>Acceso rápido a localidades de ${esc(province.name)}</h2><p>Una selección distribuida por el listado provincial. Todos los municipios siguen disponibles en el índice alfabético.</p><nav aria-label="Municipios destacados de ${esc(province.name)}">${quickTowns.map(t=>`<a href="/${province.slug}/${slugify(t)}/">Antenista en ${esc(t)} →</a>`).join('')}</nav><a class="province-back" href="#municipios-provincia">Ver todos los ${province.towns.length} municipios de ${esc(province.name)} →</a></div></section>`;
  const structured={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:title,url:canonical(route),description},breadcrumbData(province)]};
  return `${head(title,description,route,structured)}<body>${header()}<main class="local-page" id="contenido"><nav class="wrap breadcrumb" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span aria-current="page">${esc(province.name)}</span></nav><section class="province-hero"><div class="wrap"><span class="eyebrow">Servicio por municipios</span><h1>Antenistas en ${esc(province.name)}</h1><p class="hero-statement">${PHRASE}</p><p>Selecciona tu municipio para consultar antenas TDT, parabólicas, amplificación, porteros automáticos, videoporteros, cobertura móvil 4G/5G y reparaciones eléctricas.</p><a class="btn btn-primary" href="${tel()}">Llamar ${PHONE}</a></div></section>${quickAccess}${guideNavigation()}<section class="town-directory" id="municipios-provincia"><div class="wrap"><div class="directory-head"><div><span class="eyebrow">Todos los municipios</span><h2>${province.towns.length} municipios de ${esc(province.name)}</h2></div><p>Selecciona una letra para encontrar tu localidad y consultar el servicio.</p></div>${alphabet}${grouped}</div></section><section class="section contact-section" id="contacto"><div class="wrap contact-card"><div><span class="eyebrow light">Contacto directo</span><h2>Consulta tu localidad</h2><p>Llámanos e indica tu localidad de ${esc(province.name)}.</p></div><div class="contact-actions"><a class="btn btn-light" href="${tel()}">${PHONE}</a><a class="btn btn-whatsapp-light" href="${wa(`Hola, necesito un servicio en ${province.name}.`)}">WhatsApp</a></div></div></section></main>${footer(province.name)}</body></html>`;
}


function spreadTowns(province,count=20){
  const towns=[...province.towns].sort((a,b)=>a.localeCompare(b,'es'));
  if(towns.length<=count) return towns;
  const picked=[];
  for(let i=0;i<count;i++) picked.push(towns[Math.round(i*(towns.length-1)/(count-1))]);
  return [...new Set(picked)];
}
function homeTownFocus(){
  const cards=provinces.map(p=>{
    const selected=spreadTowns(p,20);
    const visible=selected.slice(0,6).map(t=>`<li><a href="/${p.slug}/${slugify(t)}/">Antenista en ${esc(t)} <span aria-hidden="true">→</span></a></li>`).join('');
    const extra=selected.slice(6).map(t=>`<li><a href="/${p.slug}/${slugify(t)}/">Antenista en ${esc(t)} <span aria-hidden="true">→</span></a></li>`).join('');
    return `<article class="town-province" data-province="${p.slug}" aria-labelledby="home-${p.slug}-title"><span class="town-count">${p.towns.length} municipios</span><h3 id="home-${p.slug}-title"><a href="/${p.slug}/">${esc(p.name)}</a></h3><ul class="town-quick-links" aria-label="Localidades destacadas de ${esc(p.name)}">${visible}</ul><details class="town-more"><summary>Ver más pueblos <span aria-hidden="true">+</span></summary><ul class="town-quick-links town-quick-links-extra" aria-label="Más localidades de ${esc(p.name)}">${extra}</ul></details><a class="town-all" href="/${p.slug}/">Ver los ${p.towns.length} municipios <span aria-hidden="true">→</span></a></article>`;
  }).join('');
  return `<section class="town-focus" id="municipios"><div class="wrap"><div class="town-focus-head"><div><span class="eyebrow">Cobertura local</span><h2>Encuentra servicio en tu pueblo</h2></div><p>Accede a una selección de localidades o entra en cada provincia para consultar todos los municipios publicados.</p></div><div class="town-province-grid">${cards}</div><div class="town-total"><strong>${totalTowns.toLocaleString('es-ES')} municipios</strong><span>con página local organizados en ${provinces.length} provincias</span></div></div></section>`;
}
function homeCoverage(){
  return `<section class="section coverage home-workflow" id="confianza"><div class="wrap"><div class="home-workflow-head"><div><span class="eyebrow">Cómo trabajamos</span><h2>Diagnóstico antes de cambiar equipos</h2></div><p>La página de cada municipio ayuda a preparar el aviso, pero el trabajo se decide sobre la instalación real: señal, cableado, amplificación, equipo terminal y sistema de acceso.</p></div><div class="home-workflow-grid"><article class="home-workflow-card"><small>01 · MEDIR</small><h3>Primero comprobamos qué señal hay</h3><p>En TDT y satélite se revisan nivel, calidad, orientación y pérdidas antes de elegir antena, filtro o amplificación.</p></article><article class="home-workflow-card"><small>02 · LOCALIZAR</small><h3>Separamos recepción, distribución y equipo final</h3><p>Si falla una toma, varios televisores o varios vecinos, el recorrido de diagnóstico cambia. En porteros se separan llamada, audio, imagen y apertura.</p></article><article class="home-workflow-card"><small>03 · RESOLVER</small><h3>Reparamos o renovamos solo lo necesario</h3><p>La propuesta distingue reparación, sustitución y ampliación. La garantía del trabajo y material instalado se concreta según presupuesto y fabricante.</p></article></div><div class="home-workflow-stats"><span><b>${provinces.length}</b> provincias</span><span><b>${totalTowns.toLocaleString('es-ES')}</b> municipios publicados</span><span><b>24h</b> urgencias</span><span><b>20 años</b> de experiencia</span></div></div></section>`;
}

fs.rmSync(ROOT,{recursive:true,force:true});
fs.mkdirSync(ROOT,{recursive:true});
fs.copyFileSync(path.resolve('styles.css'),path.join(ROOT,'styles.css'));
fs.copyFileSync(path.resolve('site.js'),path.join(ROOT,'site.js'));
if(fs.existsSync(path.resolve('assets'))) fs.cpSync(path.resolve('assets'),path.join(ROOT,'assets'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'assets','equipment'),{recursive:true});
// Las fotografías están versionadas: el build no depende de tiendas externas.
for(const file of ['ikusi-flash-hdtf-c48v.jpg','tegui-serie-8-374794.jpg']){
  const target=path.join(ROOT,'assets','equipment',file);
  if(!fs.existsSync(target)||fs.statSync(target).size<5000){
    throw new Error(`Falta fotografía local de equipo: ${file}`);
  }
}

let home=homeSource.replace('<meta name="robots" content="noindex,nofollow">', `<meta name="robots" content="${ROBOTS}">`);
home=home.replace(/<section class="town-focus" id="municipios">[\s\S]*?<\/section>/,homeTownFocus());
home=home.replace(/<section class="section coverage" id="confianza">[\s\S]*?<\/section>/,homeCoverage());
home=home.replaceAll('href="#bizkaia"','href="/bizkaia/"').replaceAll('href="#gipuzkoa"','href="/gipuzkoa/"').replaceAll('href="#alava"','href="/alava/"');
home=enhanceHome(home);
fs.writeFileSync(path.join(ROOT,'index.html'),home);
fs.writeFileSync(path.join(ROOT,GUIDE_CSS_PATH.slice(1)),GUIDE_CSS);

// SVG cuadrado y autocontenido, generado desde el logo; sin dependencias remotas.
const favicon=brandSvg
  .replace(/\s(?:aria-hidden|focusable|data-logo)="[^"]*"/g,'')
  .replace('viewBox="0 0 128 120"','viewBox="0 0 128 128" width="128" height="128"')
  .replace(/(<svg\b[^>]*>)/,'$1<title>Antenas Abaso</title><rect width="128" height="128" rx="18" fill="#fff"/>');
fs.writeFileSync(path.join(ROOT,'favicon.svg'),favicon);
for(const name of ['favicon.png','favicon.ico']) fs.copyFileSync(path.join('assets','icons',name),path.join(ROOT,name));

const manifest=[];
const routes=new Set(['/']);
for(const province of provinces){
  routes.add('/'+province.slug+'/');
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
const guideApp={head,header,footer,provider,tel,wa,domain:DOMAIN,phone:PHONE,provinces};
for(const [route,html] of [[extraRoutes[0],renderGuideIndex(guideApp)],...guides.map(g=>[guideRoute(g),renderGuide(g,guideApp)])]){
  if(routes.has(route))throw Error('Guía con ruta duplicada: '+route);
  routes.add(route);const dir=path.join(ROOT,route.slice(1));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
for(const page of legalPages){
  if(routes.has(page.route)) throw new Error(`Ruta duplicada: ${page.route}`);
  routes.add(page.route);
  const dir=path.join(ROOT,page.route.replace(/^\/+|\/+$/g,''));
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),renderLegalPage(page));
}
fs.writeFileSync(path.join(ROOT,'local-pages-manifest.json'),JSON.stringify(manifest,null,2));
// Publishing output is explicitly mode-dependent, never a manual search/replace.
const indexableRoutes=[...routes].filter(route=>!legalPages.some(page=>page.route===route));
const buildInfo={mode:MODE,towns:totalTowns,provinces:provinces.length,htmlCount:routes.size+1,serviceGuides:guides.length,indexable:production?indexableRoutes.length:0};
fs.writeFileSync(path.join(ROOT,'build-manifest.json'),JSON.stringify(buildInfo,null,2));
const headerLines=['/*', ...(!production?['  X-Robots-Tag: noindex, nofollow']:[]),
  '  X-Content-Type-Options: nosniff','  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: SAMEORIGIN','  Cache-Control: public, max-age=0, must-revalidate'];
fs.writeFileSync(path.join(ROOT,'_headers'),headerLines.join('\n')+'\n');
if(production){
  const sitemapDir=path.join(ROOT,'sitemaps');
  fs.mkdirSync(sitemapDir,{recursive:true});
  const sitemapGroups=[
    {file:'principal.xml',routes:['/',...extraRoutes]},
    ...provinces.map(province=>({
      file:`${province.slug}.xml`,
      routes:indexableRoutes.filter(route=>route===`/${province.slug}/`||route.startsWith(`/${province.slug}/`))
    }))
  ];
  for(const group of sitemapGroups){
    const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${group.routes.map(route=>`  <url><loc>${esc(canonical(route))}</loc></url>`).join('\n')}\n</urlset>\n`;
    fs.writeFileSync(path.join(sitemapDir,group.file),xml);
  }
  const sitemapIndex=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapGroups.map(group=>`  <sitemap><loc>${DOMAIN}/sitemaps/${group.file}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(ROOT,'sitemap.xml'),sitemapIndex);
  fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  // Exact rules: no SPA fallback and no broad redirect of missing towns to the home.
  const redirects=[
    ...[...routes].map(route=>`${route}index.html ${route} 301!`),
    '/img/favicon.ico /favicon.ico 301!',
    ...JSON.parse(fs.readFileSync('assets/gallery/sources.json','utf8')).map(x=>`${x.legacy} ${x.file} 301!`)
  ];
  fs.writeFileSync(path.join(ROOT,'_redirects'),redirects.join('\n')+'\n');
}else{
  fs.writeFileSync(path.join(ROOT,'preview-manifest.json'),JSON.stringify(buildInfo,null,2));
  // Google needs to crawl the preview to see noindex. No sitemap in previews.
  fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n`);
}
fs.writeFileSync(path.join(ROOT,'404.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"><link rel="stylesheet" href="/styles.css?v=abaso-20261019c"><script src="/site.js" defer></script><title>Página no disponible | Antenas Abaso</title></head><body>${header('/#contacto')}<main id="contenido" class="wrap section"><h1>Página no disponible</h1><p>La dirección solicitada no existe. Vuelve al inicio o consulta tu localidad por teléfono.</p><div class="hero-actions"><a class="btn btn-primary" href="/">Volver al inicio</a><a class="btn" href="${tel()}">Llamar ${PHONE}</a></div></main>${footer()}</body></html>`);
console.log(`BUILD ABASO OK: ${totalTowns} localidades, ${provinces.length} provincias, ${guides.length} guías, índice de servicios, portada y 3 páginas legales. Modo ${MODE}; ${buildInfo.indexable} URLs indexables.`);
