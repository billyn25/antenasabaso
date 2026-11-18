/* Progressive enhancement of the complete, static municipal directory. */
(() => {
  const widgets = document.querySelectorAll('[data-town-search]');
  if (!widgets.length) return;

  const normalize = value => String(value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  let manifestPromise = null;

  function validateManifest(data) {
    if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid municipality list');
    const paths = new Set();
    return data.map(item => {
      if (!item || typeof item !== 'object' ||
          typeof item.name !== 'string' || !item.name.trim() ||
          typeof item.province !== 'string' || !item.province.trim() ||
          typeof item.provinceSlug !== 'string' || !validSlug.test(item.provinceSlug) ||
          typeof item.slug !== 'string' || !validSlug.test(item.slug) ||
          typeof item.path !== 'string' ||
          item.path !== `/${item.provinceSlug}/${item.slug}/`) {
        throw new Error('Invalid municipality record');
      }
      const url = new URL(item.path, window.location.origin);
      if (url.origin !== window.location.origin || url.search || url.hash || paths.has(url.pathname)) {
        throw new Error('Invalid municipality URL');
      }
      paths.add(url.pathname);
      return {
        name: item.name.trim(),
        province: item.province.trim(),
        provinceSlug: item.provinceSlug,
        path: url.pathname,
        nameText: normalize(item.name),
        searchText: normalize(`${item.name} ${item.province} ${item.provinceSlug}`)
      };
    });
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('/local-pages-manifest.json', {credentials: 'same-origin'})
        .then(response => {
          if (!response.ok) throw new Error('Municipality list unavailable');
          return response.json();
        })
        .then(validateManifest)
        .catch(error => {
          manifestPromise = null;
          throw error;
        });
    }
    return manifestPromise;
  }

  for (const widget of widgets) {
    const input = widget.querySelector('[data-town-query]');
    const status = widget.querySelector('[data-town-search-status]');
    const results = widget.querySelector('[data-town-results]');
    if (!input || !status || !results) continue;
    const province = widget.getAttribute('data-province') || '';
    const prompt = 'Escribe al menos dos letras del municipio.';
    let revision = 0;

    function clearResults() {
      results.replaceChildren();
    }

    async function search(loadOnEmpty = false) {
      const currentRevision = ++revision;
      const query = normalize(input.value);
      const enoughLetters = query.replace(/\s/g, '').length >= 2;
      clearResults();
      if (!enoughLetters && !loadOnEmpty) {
        status.textContent = prompt;
        return;
      }
      status.textContent = 'Cargando municipios…';
      try {
        const towns = await loadManifest();
        if (currentRevision !== revision) return;
        if (!enoughLetters) {
          status.textContent = prompt;
          return;
        }
        const tokens = query.split(' ');
        const matches = towns.filter(town => (!province || town.provinceSlug === province) &&
          tokens.every(token => town.searchText.includes(token)));
        const relevance = town => town.nameText === query ? 0 : town.nameText.startsWith(query) ? 1 : 2;
        matches.sort((a, b) => relevance(a) - relevance(b) ||
          a.name.localeCompare(b.name, 'es') || a.province.localeCompare(b.province, 'es'));
        const visible = matches.slice(0, 8);
        const fragment = document.createDocumentFragment();
        for (const town of visible) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = town.path;
          link.textContent = `${town.name} · ${town.province}`;
          item.appendChild(link);
          fragment.appendChild(item);
        }
        results.replaceChildren(fragment);
        if (!matches.length) {
          status.textContent = 'No encontramos ese municipio. Prueba otro nombre o consulta el listado de municipios.';
        } else if (matches.length > visible.length) {
          status.textContent = `Mostrando ${visible.length} de ${matches.length} municipios. Escribe más para concretar.`;
        } else {
          status.textContent = matches.length === 1 ? '1 municipio encontrado.' : `${matches.length} municipios encontrados.`;
        }
      } catch {
        if (currentRevision !== revision) return;
        clearResults();
        status.textContent = 'No se pudo cargar el buscador. Vuelve a escribir para reintentarlo o usa el listado de municipios.';
      }
    }

    input.addEventListener('focus', () => { void search(true); });
    input.addEventListener('input', event => {
      if (!event.isComposing) void search();
    });
    input.addEventListener('compositionend', () => { void search(); });
    widget.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || (!input.value && !results.childElementCount)) return;
      event.preventDefault();
      revision++;
      input.value = '';
      clearResults();
      status.textContent = prompt;
      input.focus();
    });
    status.textContent = prompt;
    widget.hidden = false;
  }
})();
