import {provinces} from '../content/municipios.mjs';

// Editorial access points for the existing coverage directory. This order is
// not a population ranking, a distance calculation or a claim about demand.
// The complete alphabetical directories remain the source of every town URL.
export const FEATURED_TOWN_ORDER = Object.freeze({
  bizkaia: Object.freeze([
    'Bilbao', 'Getxo', 'Barakaldo', 'Zalla', 'Lekeitio', 'Basauri',
    'Santurtzi', 'Portugalete', 'Sestao', 'Sopela', 'Leioa', 'Galdakao',
    'Durango', 'Gernika-Lumo', 'Mungia', 'Bermeo', 'Balmaseda', 'Güeñes',
    'Sondika', 'Amorebieta-Etxano'
  ]),
  gipuzkoa: Object.freeze([
    'Donostia/San Sebastián', 'Irun', 'Eibar', 'Zarautz', 'Zumarraga', 'Oiartzun',
    'Tolosa', 'Beasain', 'Hernani', 'Errenteria', 'Arrasate/Mondragón', 'Bergara',
    'Azpeitia', 'Azkoitia', 'Hondarribia', 'Lasarte-Oria', 'Elgoibar', 'Deba',
    'Zumaia', 'Ordizia'
  ]),
  alava: Object.freeze([
    'Vitoria-Gasteiz', 'Laudio/Llodio', 'Amurrio', 'Laguardia', 'Agurain/Salvatierra',
    'Iruña Oka/Iruña de Oca', 'Artziniega', 'Zuia', 'Legutio', 'Oyón-Oion',
    'Labastida/Bastida', 'Valdegovía/Gaubea', 'Lantarón', 'Ayala/Aiara', 'Zigoitia',
    'Alegría-Dulantzi', 'Zambrana', 'Campezo/Kanpezu', 'Urkabustaiz',
    'Ribera Baja/Erriberabeitia'
  ]),
  burgos: Object.freeze([
    'Burgos', 'Miranda de Ebro', 'Aranda de Duero', 'Valle de Mena', 'Medina de Pomar',
    'Briviesca', 'Villarcayo de Merindad de Castilla la Vieja', 'Espinosa de los Monteros',
    'Lerma', 'Salas de los Infantes', 'Belorado', 'Roa', 'Valle de Tobalina',
    'Trespaderne', 'Villadiego', 'Oña', 'Valle de Losa', 'Merindad de Montija',
    'Pancorbo', 'Quintanar de la Sierra'
  ]),
  cantabria: Object.freeze([
    'Santander', 'Torrelavega', 'Castro-Urdiales', 'Piélagos', 'Corrales de Buelna, Los',
    'Reinosa', 'Laredo', 'Santoña', 'Camargo', 'Astillero, El', 'Cabezón de la Sal',
    'San Vicente de la Barquera', 'Colindres', 'Suances', 'Noja', 'Santa Cruz de Bezana',
    'Ramales de la Victoria', 'Medio Cudeyo', 'Santillana del Mar', 'Potes'
  ]),
  palencia: Object.freeze([
    'Palencia', 'Aguilar de Campoo', 'Guardo', 'Venta de Baños', 'Villamuriel de Cerrato',
    'Cervera de Pisuerga', 'Saldaña', 'Carrión de los Condes', 'Dueñas', 'Paredes de Nava',
    'Herrera de Pisuerga', 'Grijota', 'Villalobón', 'Barruelo de Santullán', 'Frómista',
    'Osorno la Mayor', 'Baltanás', 'Becerril de Campos', 'Santibáñez de la Peña',
    'Velilla del Río Carrión'
  ]),
  leon: Object.freeze([
    'León', 'Ponferrada', 'San Andrés del Rabanedo', 'Villaquilambre', 'Astorga',
    'Bañeza, La', 'Bembibre', 'Valencia de Don Juan', 'Villablino', 'Boñar',
    'Mansilla de las Mulas', 'Cistierna', 'Sahagún', 'Robla, La', 'Cacabelos',
    'Villafranca del Bierzo', 'Santa María del Páramo', 'Valverde de la Virgen',
    'Sariegos', 'Riaño'
  ]),
  navarra: Object.freeze([
    'Pamplona/Iruña', 'Tudela', 'Estella-Lizarra', 'Tafalla', 'Barañáin/Barañain',
    'Burlada/Burlata', 'Zizur Mayor/Zizur Nagusia', 'Valle de Egüés/Eguesibar',
    'Berriozar', 'Villava/Atarrabia', 'Altsasu/Alsasua', 'San Adrián', 'Corella',
    'Cintruénigo', 'Sangüesa/Zangoza', 'Olite/Erriberri', 'Baztan', 'Bera', 'Lesaka',
    'Puente la Reina/Gares'
  ]),
  valladolid: Object.freeze([
    'Valladolid', 'Arroyo de la Encomienda', 'Laguna de Duero', 'Medina del Campo',
    'Tordesillas', 'Tudela de Duero', 'Cistérniga', 'Zaratán', 'Simancas', 'Cigales',
    'Peñafiel', 'Medina de Rioseco', 'Íscar', 'Olmedo', 'Boecillo',
    'Aldeamayor de San Martín', 'Cabezón de Pisuerga', 'Santovenia de Pisuerga',
    'Pedrajas de San Esteban', 'Mojados'
  ])
});

const provinceBySlug = new Map(provinces.map(province => [province.slug, province]));
const slugify = value => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function knownProvince(province) {
  const slug = typeof province === 'string' ? province : province?.slug;
  const known = provinceBySlug.get(slug);
  if (!known) throw Error(`Provincia de cobertura desconocida: ${String(slug)}`);
  return known;
}

function assertPublishedTown(province, town) {
  if (!province.towns.includes(town)) {
    throw Error(`Municipio destacado no publicado: ${province.slug}/${town}`);
  }
}

// Validate the entire editorial inventory, including entries outside a short
// slice. An outdated name must fail the build instead of generating a dead URL.
for (const province of provinces) {
  const selected = FEATURED_TOWN_ORDER[province.slug];
  if (!selected || selected.length !== 20 || new Set(selected).size !== 20) {
    throw Error(`Se necesitan veinte municipios destacados distintos: ${province.slug}`);
  }
  for (const town of selected) assertPublishedTown(province, town);
}
for (const slug of Object.keys(FEATURED_TOWN_ORDER)) knownProvince(slug);

/** Returns exact published town names. Never mutates the directory or its order. */
export function featuredTowns(province, count = 20) {
  const known = knownProvince(province);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('El número de municipios destacados debe ser un entero no negativo');
  }
  const selected = FEATURED_TOWN_ORDER[known.slug];
  if (count <= selected.length) return selected.slice(0, count);
  const selectedSet = new Set(selected);
  const remaining = known.towns.filter(town => !selectedSet.has(town))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return [...selected, ...remaining].slice(0, count);
}

// Separate coverage links, never members of the six-nearest list. In the
// verified municipal coordinates, Javier is the nearest published town to
// Petilla, and Orreaga/Roncesvalles is the nearest to Luzaide/Valcarlos.
// No road connection, journey time or additional distance is claimed here.
const additionalCoverage = [
  {province: 'navarra', source: 'Javier', target: 'Petilla de Aragón'},
  {province: 'navarra', source: 'Orreaga/Roncesvalles', target: 'Luzaide/Valcarlos'}
];
for (const entry of additionalCoverage) {
  const province = knownProvince(entry.province);
  assertPublishedTown(province, entry.source);
  assertPublishedTown(province, entry.target);
  if (entry.source === entry.target) throw Error('Un enlace de cobertura no puede apuntar a su origen');
}

/** Render these with a separate label such as "Más cobertura en Navarra". */
export function secondaryCoverageLinks(province, town) {
  const known = knownProvince(province);
  assertPublishedTown(known, town);
  return additionalCoverage.filter(entry => entry.province === known.slug && entry.source === town)
    .map(entry => ({
      name: entry.target,
      province: known.slug,
      provinceName: known.name,
      path: `/${known.slug}/${slugify(entry.target)}/`
    }));
}
