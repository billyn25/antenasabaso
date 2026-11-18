import data from '../content/local-reception.json' with { type: 'json' };
import { provinces } from '../content/municipios.mjs';
import {townRegionalSignals,provinceRegionalSignals,regionalServiceName,regionalSourceList,regionalReviewed} from './regional-television.mjs';

export const RECEPTION_CSS_PATH = '/local-reception-20261118.css';
export const reviewed = data.reviewed;
const reviewedLabel = new Intl.DateTimeFormat('es-ES', {day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(`${reviewed}T00:00:00Z`));
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const coverage = data.sources.programmes;
// National television services, checked against the Ministry's November 2026 chart.
export const programmes = {
  RGE1: 'La 1 · La 2 · 24h · Teledeporte · Clan',
  RGE2: 'La 1 UHD · La 2 UHD · Antena 3 UHD · Telecinco UHD',
  MPE1: 'Squirrel · Squirrel 2 · Veo 7 · DMAX',
  MPE2: 'Antena 3 · laSexta · Neox · Nova · A3Series',
  MPE3: 'Telecinco · Cuatro · FDF · Divinity · BeMad',
  MPE4: 'Mega · Trece · Energy · Boing',
  MPE5: 'La Séptima · Ten · Real Madrid TV · DKISS',
  MAUT: 'Autonómico: frecuencia planificada'
};
export function townReception(province, town) {
  const record = data.towns[province]?.[town];
  if (!record) throw Error(`Faltan datos de recepción: ${province}/${town}`);
  return record;
}
export function frequencyMHz(channel) {
  if (!Number.isInteger(channel) || channel < 21 || channel > 48) throw Error('Canal UHF fuera de rango');
  return 474 + 8 * (channel - 21);
}
export function distanceKm(a,b) {
  const rad = n => n * Math.PI / 180;
  const dlat = rad(b[0]-a[0]), dlon = rad(b[1]-a[1]);
  const h = Math.sin(dlat/2)**2 + Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dlon/2)**2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
const locations = provinces.flatMap(p => p.towns.map(t => ({name:t,province:p.slug,provinceName:p.name,path:`/${p.slug}/${slug(t)}/`,...townReception(p.slug,t)})));
const nearbyCache = new Map();
export function nearestTowns(province,town) {
  const key = `${province}/${town}`;
  if (!nearbyCache.has(key)) {
    const origin = townReception(province,town);
    nearbyCache.set(key,locations.filter(t => !(t.province===province && t.name===town))
      .map(t => ({...t,km:distanceKm(origin.coordinates,t.coordinates)}))
      .sort((a,b) => a.km-b.km || a.path.localeCompare(b.path)).slice(0,6));
  }
  return nearbyCache.get(key);
}
function signalAttributes(signal) {
  return ` data-tdt-services="${esc(signal.services.map(id=>`tv:${id}`).join(' '))}"${signal.planned?' data-tdt-planned="true"':''}`;
}
function zoneTable(zone, signals=[]) {
  const channels = data.zones[zone];
  if (!channels || channels.length!==8) throw Error(`Zona TDT incompleta: ${zone}`);
  const regional=signals.find(signal=>signal.inPlan && signal.area===zone);
  return `<div class="tdt-table-wrap"><table class="tdt-table"><caption>Zona técnica: ${esc(zone)}</caption><thead><tr><th scope="col">MUX</th><th scope="col">Canal UHF</th><th scope="col">MHz</th><th scope="col">Cadenas</th></tr></thead><tbody>${data.muxOrder.map((mux,i)=>{
    const signal=mux==='MAUT'?regional:null;
    const names=signal?signal.services.map(regionalServiceName).join(' · '):programmes[mux];
    return `<tr data-tdt-mux="${mux}" data-tdt-zone="${esc(zone)}" data-tdt-uhf="${channels[i]}" data-tdt-mhz="${frequencyMHz(channels[i])}"${signal?signalAttributes(signal):''}${mux==='RGE2'?' class="tdt-uhd"':''}><th scope="row">${mux}</th><td>${channels[i]}</td><td>${frequencyMHz(channels[i])}</td><td>${esc(names)}${mux==='RGE2'?'<small>DVB-T2 · HEVC/H.265 · UHD</small>':''}${signal?.planned?'<small>Frecuencia del plan técnico; confirma la emisión en tu dirección.</small>':''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function regionalIntroduction(signals) {
  if(!signals.length) return '';
  const autonomic=[...new Set(signals.filter(s=>s.scope==='autonomic').flatMap(s=>s.services))].map(regionalServiceName);
  const local=[...new Set(signals.filter(s=>s.scope==='local').flatMap(s=>s.services))].map(regionalServiceName);
  const notes=[...new Set(signals.filter(s=>s.scope==='autonomic').map(s=>s.note).filter(Boolean))];
  return `<div class="tdt-regional-intro" id="canales-autonomicos-locales"><h3>Canales autonómicos y locales</h3>${autonomic.length?`<p><strong>Autonómicos:</strong> ${esc(autonomic.join(' · '))}.</p>`:''}${local.length?`<p><strong>Locales de las zonas indicadas:</strong> ${esc(local.join(' · '))}.</p>`:''}${notes.map(note=>`<p class="tdt-note">${esc(note)}</p>`).join('')}</div>`;
}
function additionalRegionalTable(signals) {
  const extra=signals.filter(signal=>!signal.inPlan);
  if(!extra.length) return '';
  return `<div class="tdt-table-wrap"><table class="tdt-table tdt-regional-table"><caption>Televisión autonómica y local · cobertura específica</caption><thead><tr><th scope="col">Ámbito</th><th scope="col">Canal UHF</th><th scope="col">MHz</th><th scope="col">Cadenas y recepción</th></tr></thead><tbody>${extra.map(signal=>{
    const known=Number.isInteger(signal.uhf);
    return `<tr data-tdt-mux="${esc(signal.mux)}" data-tdt-zone="${esc(signal.area)}"${signalAttributes(signal)}${known?` data-tdt-uhf="${signal.uhf}" data-tdt-mhz="${frequencyMHz(signal.uhf)}"`:''}><th scope="row">${esc(signal.area)}<small>${signal.scope==='local'?'Local':'Autonómico'}</small></th><td>${known?signal.uhf:'Consultar'}</td><td>${known?frequencyMHz(signal.uhf):'—'}</td><td>${esc(signal.services.map(regionalServiceName).join(' · '))}<small>${esc(signal.note || 'Consulta la cobertura de tu dirección; la frecuencia depende del centro emisor.')}</small></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function channelFinder(town, signals) {
  const regionalOptions=[['autonomic','Canales autonómicos'],['local','Canales locales']].map(([scope,label])=>{
    const ids=[...new Set(signals.filter(s=>s.scope===scope).flatMap(s=>s.services))];
    return ids.length?`<optgroup label="${label}">${ids.map(id=>`<option value="tv:${esc(id)}">${esc(regionalServiceName(id))}</option>`).join('')}</optgroup>`:'';
  }).join('');
  const options = data.muxOrder.filter(mux=>mux!=='MAUT').map(mux=>`<optgroup label="${mux}">${programmes[mux].split(' · ').map(channel=>`<option value="${mux}">${esc(channel)}</option>`).join('')}</optgroup>`).join('');
  return `<form class="tdt-finder" data-tdt-finder hidden aria-label="Consultar la frecuencia de una cadena en ${esc(town)}"><label for="tdt-cadena">¿Qué cadena necesitas sintonizar?</label><p id="tdt-finder-help">Selecciona la cadena para consultar su canal UHF, frecuencia o información de cobertura en ${esc(town)}.</p><div class="tdt-finder-controls"><select id="tdt-cadena" name="cadena" aria-describedby="tdt-finder-help" required><option value="">Selecciona una cadena</option>${regionalOptions}${options}</select><button type="submit">Ver frecuencia</button></div><p class="tdt-finder-result" data-tdt-result role="status" aria-live="polite" aria-atomic="true">Elige una cadena y pulsa «Ver frecuencia».</p></form>`;
}
function receptionSources(zones, signals=[]) {
  const links = zones.map(zone=>`<a href="https://www.antenadigital.es/tdt/${slug(zone).replaceAll('-','')}.php">${esc(zone)} en AntenaDigital</a>`);
  const regionalLinks=regionalSourceList(signals).map(source=>`<a href="${esc(source.url)}">${esc(source.label)}</a>`).join('');
  return `<div class="tdt-sources"><span>Plan y cadenas nacionales: <time datetime="${reviewed}">${reviewedLabel}</time></span><a href="${data.sources.plan}#ai-2">Plan de frecuencias</a><a href="${coverage}">Cobertura por código postal</a>${links.join('')}${regionalLinks?`<span>Autonómicas y locales: <time datetime="${regionalReviewed}">${regionalReviewed.split('-').reverse().join('/')}</time></span>${regionalLinks}`:''}</div>`;
}
export function renderTownReception(province,town) {
  const record = townReception(province.slug,town);
  const signals = townRegionalSignals(province.slug,record,data.zones);
  const rge1 = [...new Set(record.zones.map(z=>data.zones[z][0]))].join(' / ');
  const mpe5 = [...new Set(record.zones.map(z=>data.zones[z][6]))].join(' / ');
  return `<section class="local-reception" id="frecuencias-tdt"><div class="wrap"><div class="tdt-heading"><div><span class="eyebrow">Sintonizar la televisión</span><h2>Canales y frecuencias TDT en ${esc(town)}</h2></div><a href="#pueblos-cercanos">Ver pueblos cercanos ↓</a></div><p>Consulta el canal UHF o los MHz en la búsqueda manual del televisor. Cada MUX reúne varias cadenas en una misma frecuencia.</p>${regionalIntroduction(signals)}${channelFinder(town,signals)}${record.zones.map(zone=>zoneTable(zone,signals)).join('')}${additionalRegionalTable(signals)}<p class="tdt-note">La recepción depende del repetidor y de la instalación. Comprueba la cobertura de tu código postal. Las televisiones locales tienen su propia zona de emisión; esta ficha no garantiza que lleguen a todas las viviendas ni recoge todas las posibles emisiones.</p><div class="tdt-help"><article><h3>Cómo buscar los canales</h3><ol><li>Entra en Ajustes → Canales o Emisión.</li><li>Elige Antena / TDT y búsqueda automática.</li><li>Si sigue faltando un grupo, usa la búsqueda manual con su canal UHF de la tabla.</li><li>Guarda los resultados y ordena las cadenas.</li></ol></article><article><h3>¿Falta Clan o La Séptima?</h3><p>Tras los cambios de noviembre de 2026, Clan está en RGE1: <strong>UHF ${rge1}</strong>. La Séptima y DKISS están en MPE5: <strong>UHF ${mpe5}</strong>. A3Series, BeMad y Boing también han cambiado de MUX.</p><p>Para ver las emisiones UHD de RGE2, el receptor necesita DVB-T2 y HEVC/H.265. Las versiones HD continúan en otros múltiplex.</p></article></div><details class="tdt-faults"><summary>He resintonizado y siguen faltando canales</summary><p>Si fallan juntas las cadenas de una fila, comprueba la calidad de ese MUX en el menú de señal. Si el fallo aparece solo en una toma, prueba otro cable de antena. Si también les ocurre a los vecinos, conviene revisar la recepción y la distribución comunitaria.</p><a href="/servicios/reparacion-antenas-tdt/">Ver comprobaciones de la antena TDT →</a></details>${receptionSources(record.zones,signals)}</div></section>`;
}
export function renderNearby(province,town) {
  return `<section class="local-related" id="pueblos-cercanos"><div class="wrap"><span class="eyebrow">Servicio en la zona</span><h2>Pueblos cercanos a ${esc(town)}</h2><p class="nearby-caption">Distancia aproximada en línea recta</p><div class="related-grid">${nearestTowns(province.slug,town).map(t=>`<a href="${t.path}"><span>Antenista en ${esc(t.name)}${t.province!==province.slug?`<small>${esc(t.provinceName)}</small>`:''}</span><strong>≈ ${Math.max(1,Math.round(t.km))} km <span aria-hidden="true">→</span></strong></a>`).join('')}</div><div class="nearby-footer"><a class="province-back" href="/${province.slug}/">Ver todos los municipios de ${esc(province.name)} →</a><a class="geo-credit" href="https://www.ign.es/web/ign/portal/ane-datos-geograficos">IGN · CC BY 4.0</a></div></div></section>`;
}
export function renderProvinceReception(province) {
  const zones = [...new Set(province.towns.flatMap(t=>townReception(province.slug,t).zones))].sort((a,b)=>a.localeCompare(b,'es'));
  const signals=provinceRegionalSignals(province.slug,zones,data.zones);
  return `<section class="local-reception" id="frecuencias-tdt"><div class="wrap"><span class="eyebrow">Frecuencias por zona</span><h2>Múltiplex TDT en ${esc(province.name)}</h2><p>Entra en la ficha de tu municipio para consultar sus frecuencias de sintonización.</p>${regionalIntroduction(signals)}${zones.map(z=>`<details class="province-tdt-zone"${zones.length===1?' open':''}><summary>${esc(z)}</summary>${zoneTable(z,signals)}</details>`).join('')}${additionalRegionalTable(signals)}<p class="tdt-note">Canales UHF del plan técnico. La recepción depende del repetidor. Los canales locales indicados corresponden a las zonas de su tabla, no a toda la provincia.</p>${receptionSources(zones,signals)}</div></section>`;
}
