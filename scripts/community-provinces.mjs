const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const communityProvinces = Object.freeze({
  bizkaia: {
    name: 'Bizkaia',
    heading: 'Comunidades en Bizkaia: antenas colectivas y videoporteros',
    paragraphs: [
      'Para solicitar la instalación o reparación de una antena colectiva o un videoportero en una comunidad de viviendas de Bizkaia, indica el municipio y cuántas viviendas hay. Si hay una avería, concreta si afecta a todo el edificio, a varias plantas o a una sola vivienda. En televisión, anota qué canales fallan y en qué tomas.',
      'En el videoportero, describe por separado llamada, sonido, imagen y apertura. Para una instalación nueva o una renovación, explica cuántas viviendas y accesos deben atenderse y qué equipos se quieren conservar. El presidente, administrador o persona encargada puede coordinar el acceso a las zonas comunes y los puntos de comprobación.'
    ],
    town: {name: 'Bilbao', href: '/bizkaia/bilbao/'}
  },
  gipuzkoa: {
    name: 'Gipuzkoa',
    heading: 'Instalar o renovar antenas y videoporteros en comunidades de Gipuzkoa',
    paragraphs: [
      'Una instalación nueva o renovación de antena colectiva y videoportero en una comunidad de viviendas de Gipuzkoa empieza por definir viviendas, portales y equipos que se quieren conservar. Para pasar de portero de audio a vídeo, indica cuántos monitores se necesitan y qué funciones se buscan. El aprovechamiento del cableado se comprueba antes de elegir el sistema.',
      'Si lo que necesitas es una reparación, detalla los canales o las funciones que fallan y cuántas viviendas están afectadas. La compatibilidad de un monitor se verifica con el sistema instalado. Prepara el municipio, una referencia visible del equipo y la persona que coordinará los accesos; pide que el presupuesto concrete materiales y pruebas finales.'
    ],
    town: {name: 'Donostia/San Sebastián', href: '/gipuzkoa/donostia-san-sebastian/'}
  },
  alava: {
    name: 'Álava',
    heading: 'Antenas y videoporteros para comunidades de viviendas en Álava',
    paragraphs: [
      'Para instalar, renovar o reparar antenas colectivas y videoporteros en una comunidad de viviendas de Álava, concreta qué parte del edificio incluye la consulta. En televisión, distingue la cabecera y la distribución común de las tomas interiores que se quieren revisar. En el videoportero, indica las placas de acceso, los monitores y las viviendas afectadas.',
      'Pide un presupuesto que separe diagnóstico, materiales y trabajos en zonas comunes de las actuaciones dentro de las viviendas. Debe quedar claro qué equipos se conservan o sustituyen y cómo se comprobará el resultado. Para preparar la visita, comunica el municipio, el número de viviendas y portales, los accesos necesarios y quién coordinará la intervención con la comunidad.'
    ],
    town: {name: 'Vitoria-Gasteiz', href: '/alava/vitoria-gasteiz/'}
  }
});

export function renderCommunityProvince(province, app) {
  const slug = province?.slug;
  if (typeof slug !== 'string' || !Object.hasOwn(communityProvinces, slug)) return '';

  const content = communityProvinces[slug];
  const message = `Hola, quiero consultar la instalación o reparación de una antena colectiva o un videoportero para una comunidad de viviendas en ${content.name}. Mi municipio es: `;
  const otherProvinces = Object.entries(communityProvinces).filter(([otherSlug]) => otherSlug !== slug);

  return `<section class="community-province" id="comunidades" aria-labelledby="community-province-title">
  <div class="wrap">
    <div class="community-province-heading">
      <span class="eyebrow">Comunidades de viviendas</span>
      <h2 id="community-province-title">${esc(content.heading)}</h2>
    </div>
    <div class="community-province-copy">${content.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</div>
    <nav class="community-province-links" aria-label="Guías y servicio local para comunidades">
      <a href="/servicios/antenas-colectivas/">Antenas colectivas para comunidades</a>
      <a href="/servicios/videoporteros/">Instalación y reparación de videoporteros</a>
      <a href="${esc(content.town.href)}">Servicio en ${esc(content.town.name)}</a>
    </nav>
    <div class="community-province-actions">
      <a class="btn btn-primary" href="${esc(app.tel())}">Llamar ${esc(app.phone)}</a>
      <a class="btn btn-whatsapp" href="${esc(app.wa(message))}">Consultar la comunidad por WhatsApp</a>
    </div>
    <nav class="community-province-coverage" aria-label="Servicio en el País Vasco">
      <span class="community-province-coverage-label">Servicio en el País Vasco</span>
      ${otherProvinces.map(([otherSlug, other]) => `<a href="/${esc(otherSlug)}/">Antenistas en ${esc(other.name)}</a>`).join('')}
    </nav>
  </div>
</section>`;
}
