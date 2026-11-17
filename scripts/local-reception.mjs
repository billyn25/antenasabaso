import data from '../content/local-reception.json' with { type: 'json' };
import { provinces } from '../content/municipios.mjs';

export const RECEPTION_CSS_PATH = '/local-reception-20261117.css';
export const reviewed = data.reviewed;
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
function zoneTable(zone) {
  const channels = data.zones[zone];
  if (!channels || channels.length!==8) throw Error(`Zona TDT incompleta: ${zone}`);
  return `<div class="tdt-table-wrap"><table class="tdt-table"><caption>Zona técnica: ${esc(zone)}</caption><thead><tr><th scope="col">MUX</th><th scope="col">Canal UHF</th><th scope="col">MHz</th><th scope="col">Cadenas</th></tr></thead><tbody>${data.muxOrder.map((mux,i)=>`<tr${mux==='RGE2'?' class="tdt-uhd"':''}><th scope="row">${mux}</th><td>${channels[i]}</td><td>${frequencyMHz(channels[i])}</td><td>${esc(programmes[mux])}${mux==='RGE2'?'<small>DVB-T2 · HEVC/H.265 · UHD</small>':''}</td></tr>`).join('')}</tbody></table></div>`;
}
function receptionSources(zones) {
  const links = zones.map(zone=>`<a href="https://www.antenadigital.es/tdt/${slug(zone).replaceAll('-','')}.php">${esc(zone)} en AntenaDigital</a>`);
  return `<div class="tdt-sources"><span>Revisado: <time datetime="${reviewed}">17/11/2026</time></span><a href="${data.sources.plan}#anii">Plan de frecuencias</a><a href="${coverage}">Cobertura por código postal</a>${links.join('')}</div>`;
}
export function renderTownReception(province,town) {
  const record = townReception(province.slug,town);
  const rge1 = [...new Set(record.zones.map(z=>data.zones[z][0]))].join(' / ');
  const mpe5 = [...new Set(record.zones.map(z=>data.zones[z][6]))].join(' / ');
  return `<section class="local-reception" id="frecuencias-tdt"><div class="wrap"><div class="tdt-heading"><div><span class="eyebrow">Sintonizar la televisión</span><h2>Canales y frecuencias TDT en ${esc(town)}</h2></div><a href="#pueblos-cercanos">Ver pueblos cercanos ↓</a></div><p>Consulta el canal UHF o los MHz en la búsqueda manual del televisor. Cada MUX reúne varias cadenas en una misma frecuencia.</p>${record.zones.map(zoneTable).join('')}<p class="tdt-note">La recepción depende del repetidor; comprueba la cobertura de tu código postal. Los canales locales pueden usar otras frecuencias.</p><div class="tdt-help"><article><h3>Cómo buscar los canales</h3><ol><li>Entra en Ajustes → Canales o Emisión.</li><li>Elige Antena / TDT y búsqueda automática.</li><li>Si sigue faltando un grupo, usa la búsqueda manual con su canal UHF de la tabla.</li><li>Guarda los resultados y ordena las cadenas.</li></ol></article><article><h3>¿Falta Clan o La Séptima?</h3><p>Tras los cambios de noviembre de 2026, Clan está en RGE1: <strong>UHF ${rge1}</strong>. La Séptima y DKISS están en MPE5: <strong>UHF ${mpe5}</strong>. A3Series, BeMad y Boing también han cambiado de MUX.</p><p>Para ver las emisiones UHD de RGE2, el receptor necesita DVB-T2 y HEVC/H.265. Las versiones HD continúan en otros múltiplex.</p></article></div><details class="tdt-faults"><summary>He resintonizado y siguen faltando canales</summary><p>Si fallan juntas las cadenas de una fila, comprueba la calidad de ese MUX en el menú de señal. Si el fallo aparece solo en una toma, prueba otro cable de antena. Si también les ocurre a los vecinos, conviene revisar la recepción y la distribución comunitaria.</p><a href="/servicios/reparacion-antenas-tdt/">Ver comprobaciones de la antena TDT →</a></details>${receptionSources(record.zones)}</div></section>`;
}
export function renderNearby(province,town) {
  return `<section class="local-related" id="pueblos-cercanos"><div class="wrap"><span class="eyebrow">Servicio en la zona</span><h2>Pueblos cercanos a ${esc(town)}</h2><p class="nearby-caption">Distancia aproximada en línea recta</p><div class="related-grid">${nearestTowns(province.slug,town).map(t=>`<a href="${t.path}"><span>Antenista en ${esc(t.name)}${t.province!==province.slug?`<small>${esc(t.provinceName)}</small>`:''}</span><strong>≈ ${Math.max(1,Math.round(t.km))} km <span aria-hidden="true">→</span></strong></a>`).join('')}</div><div class="nearby-footer"><a class="province-back" href="/${province.slug}/">Ver todos los municipios de ${esc(province.name)} →</a><a class="geo-credit" href="https://www.ign.es/web/ign/portal/ane-datos-geograficos">IGN · CC BY 4.0</a></div></div></section>`;
}
export function renderProvinceReception(province) {
  const zones = [...new Set(province.towns.flatMap(t=>townReception(province.slug,t).zones))].sort((a,b)=>a.localeCompare(b,'es'));
  return `<section class="local-reception" id="frecuencias-tdt"><div class="wrap"><span class="eyebrow">Frecuencias por zona</span><h2>Múltiplex TDT en ${esc(province.name)}</h2><p>Entra en la ficha de tu municipio para consultar sus frecuencias de sintonización.</p>${zones.map((z,i)=>`<details class="province-tdt-zone"${zones.length===1?' open':''}><summary>${esc(z)}</summary>${zoneTable(z)}</details>`).join('')}<p class="tdt-note">Canales UHF del plan técnico. La recepción y las emisiones autonómicas dependen del repetidor.</p>${receptionSources(zones)}</div></section>`;
}
