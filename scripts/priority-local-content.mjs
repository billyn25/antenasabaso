import content from '../content/priority-local-content.json' with { type: 'json' };
import reception from '../content/local-reception.json' with { type: 'json' };

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export const priorityLocalRoutes = Object.freeze(Object.keys(content));

// Plain editorial text stays separate from the frequency dataset so the next
// reviewed TDT update cannot leave stale UHF/MHz figures in the local guidance.
function localText(value, entry) {
  const town = reception.towns[entry.province]?.[entry.town];
  if (!town) throw new Error(`Falta recepción para ${entry.province}/${entry.town}`);
  const muxValues = Object.fromEntries(reception.muxOrder.flatMap((mux, index) => {
    const channels = [...new Set(town.zones.map(zone => reception.zones[zone][index]))];
    return [
      [`${mux.toLowerCase()}_uhf`, channels.join(' / ')],
      [`${mux.toLowerCase()}_mhz`, channels.map(channel => 474 + 8 * (channel - 21)).join(' / ')]
    ];
  }));
  const fields = {...muxValues, zone:town.zones.join(' / ')};
  return String(value).replace(/\{\{([a-z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in fields)) throw new Error(`Variable de contenido local desconocida: ${key}`);
    return fields[key];
  });
}

export function getPriorityLocalContent(route) {
  const entry = content[route];
  if (!entry) return null;
  return {
    ...entry,
    intro:localText(entry.intro,entry),
    lead:localText(entry.lead,entry),
    cards:entry.cards.map(card=>({...card,text:localText(card.text,entry)}))
  };
}

export function renderPriorityLocalContent(route) {
  const entry = getPriorityLocalContent(route);
  if (!entry) return '';
  return `<section class="priority-local-section" id="ayuda-local"><div class="wrap"><div class="priority-local-heading"><span class="eyebrow">Instalación y reparación</span><h2>${esc(entry.heading)}</h2><p>${esc(entry.lead)}</p></div><div class="priority-local-grid">${entry.cards.map(card=>`<article class="priority-local-card"><h3>${esc(card.heading)}</h3><p>${esc(card.text)}</p></article>`).join('')}</div><div class="priority-local-preparation"><h3>Ten estos datos a mano</h3><ul>${entry.preparation.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><nav class="priority-local-links" aria-label="Información para instalar o reparar">${entry.links.map(link=>`<a href="${esc(link.href)}">${esc(link.label)} <span aria-hidden="true">→</span></a>`).join('')}<a href="#contacto">Consultar este servicio <span aria-hidden="true">→</span></a></nav></div></section>`;
}
