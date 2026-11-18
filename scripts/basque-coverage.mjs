import {provinces} from '../content/municipios.mjs';

// Editorial entry points for the Basque Country. These links complement the
// complete nine-province directory; they do not imply offices or response times.
const selectedTowns = [
  {slug: 'bizkaia', towns: ['Bilbao', 'Getxo', 'Barakaldo', 'Durango']},
  {slug: 'gipuzkoa', towns: ['Donostia/San Sebastián', 'Irun', 'Eibar', 'Zumarraga']},
  {slug: 'alava', towns: ['Vitoria-Gasteiz', 'Laudio/Llodio', 'Amurrio', 'Laguardia']}
];

const esc = value => String(value).replace(/[&<>"']/g,
  character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
// Keep the same route convention as build.mjs and the published directory.
const slugify = value => String(value).toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const cards = selectedTowns.map(selection => {
  const province = provinces.find(item => item.slug === selection.slug);
  if (!province) throw new Error(`Provincia no publicada en cobertura vasca: ${selection.slug}`);
  if (selection.towns.length !== 4 || new Set(selection.towns).size !== 4) {
    throw new Error(`Se necesitan cuatro municipios distintos de ${province.name}`);
  }
  const towns = selection.towns.map(name => {
    if (!province.towns.includes(name)) {
      throw new Error(`Municipio no publicado en cobertura vasca: ${province.slug}/${name}`);
    }
    const slug = slugify(name);
    if (province.towns.filter(town => slugify(town) === slug).length !== 1) {
      throw new Error(`Ruta municipal ambigua en cobertura vasca: ${province.slug}/${slug}`);
    }
    return {name, path: `/${province.slug}/${slug}/`};
  });
  return {name: province.name, slug: province.slug, towns};
});

export function renderBasqueCoverage() {
  const provincesHtml = cards.map(province => `
      <article class="basque-coverage-card" aria-labelledby="basque-coverage-${province.slug}">
        <h3 id="basque-coverage-${province.slug}">${esc(province.name)}</h3>
        <ul class="basque-coverage-towns">${province.towns.map(town => `<li><a href="${town.path}">${esc(town.name)}</a></li>`).join('')}</ul>
        <a class="basque-coverage-directory" href="/${province.slug}/">Ver todos los municipios de ${esc(province.name)} <span aria-hidden="true">→</span></a>
      </article>`).join('');
  return `<section class="basque-coverage" id="pais-vasco" aria-labelledby="basque-coverage-title">
  <div class="wrap">
    <div class="basque-coverage-heading">
      <h2 id="basque-coverage-title">Antenas, porteros y videoporteros en el País Vasco</h2>
      <p>Instalación y reparación para viviendas y comunidades en Bizkaia, Gipuzkoa y Álava. Elige tu municipio para consultar el servicio y las frecuencias TDT de tu zona.</p>
    </div>
    <div class="basque-coverage-grid">${provincesHtml}
    </div>
    <a class="basque-coverage-all" href="#municipios">Ver todas las provincias <span aria-hidden="true">→</span></a>
  </div>
</section>`;
}
