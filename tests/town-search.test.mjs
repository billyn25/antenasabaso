import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/town-search.js', import.meta.url), 'utf8');
const record = (name, province, provinceSlug, slug) => ({name, province, provinceSlug, slug, path: `/${provinceSlug}/${slug}/`});
const municipalities = [
  record('Piélagos', 'Cantabria', 'cantabria', 'pielagos'),
  record('Corrales de Buelna, Los', 'Cantabria', 'cantabria', 'corrales-de-buelna-los'),
  record('Laudio/Llodio', 'Álava', 'alava', 'laudio-llodio'),
  record('Güeñes', 'Bizkaia', 'bizkaia', 'guenes'),
  record('San Adrián', 'Navarra', 'navarra', 'san-adrian'),
  record('San Vicente de la Barquera', 'Cantabria', 'cantabria', 'san-vicente-de-la-barquera')
];

class Element {
  constructor(fragment = false) {
    this.fragment = fragment;
    this.children = [];
    this.listeners = {};
    this.textContent = '';
    this.value = '';
    this.hidden = true;
  }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name, event = {}) { for (const callback of this.listeners[name] || []) callback(event); }
  appendChild(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.children = nodes.flatMap(node => node.fragment ? node.children : [node]); }
  get childElementCount() { return this.children.length; }
  focus() { this.focused = true; }
}

function fixture({province = '', responses = [municipalities]} = {}) {
  const widget = new Element(), input = new Element(), status = new Element(), results = new Element();
  widget.getAttribute = name => name === 'data-province' ? province : null;
  widget.querySelector = selector => ({
    '[data-town-query]': input,
    '[data-town-search-status]': status,
    '[data-town-results]': results
  })[selector];
  let calls = 0;
  vm.runInNewContext(script, {
    URL,
    window: {location: {origin: 'https://antenasabaso.com'}},
    document: {
      querySelectorAll: () => [widget],
      createElement: () => new Element(),
      createDocumentFragment: () => new Element(true)
    },
    fetch: async url => {
      assert.equal(url, '/local-pages-manifest.json');
      const response = responses[Math.min(calls++, responses.length - 1)];
      if (response instanceof Error) throw response;
      return {ok: true, json: async () => response};
    }
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return {
    widget, input, status, results, calls: () => calls,
    links: () => results.children.map(item => item.children[0]),
    async type(value) { input.value = value; input.dispatch('input'); await flush(); },
    async focus() { input.dispatch('focus'); await flush(); }
  };
}

test('municipal search loads lazily and accepts accents, case and reordered tokens', async () => {
  const ui = fixture();
  assert.equal(ui.widget.hidden, false);
  assert.equal(ui.calls(), 0);
  await ui.type('p');
  assert.equal(ui.calls(), 0);
  await ui.focus();
  assert.equal(ui.calls(), 1);
  await ui.type('PIELAGOS');
  assert.equal(ui.links()[0].href, '/cantabria/pielagos/');
  await ui.type('buelna los corrales');
  assert.equal(ui.links()[0].href, '/cantabria/corrales-de-buelna-los/');
  await ui.type('guenes');
  assert.equal(ui.links()[0].href, '/bizkaia/guenes/');
  await ui.type('llodio alava');
  assert.equal(ui.links()[0].href, '/alava/laudio-llodio/');
  assert.equal(ui.calls(), 1);
});

test('province filters keep native links inside the selected coverage', async () => {
  const ui = fixture({province: 'cantabria'});
  await ui.type('san');
  assert.equal(ui.links().length, 1);
  assert.equal(ui.links()[0].href, '/cantabria/san-vicente-de-la-barquera/');
  await ui.type('laudio');
  assert.equal(ui.links().length, 0);
  assert.match(ui.status.textContent, /No encontramos/);
});

test('invalid manifest routes are rejected and the next input can retry', async () => {
  const invalid = [{...municipalities[0], path: '//other.example/pielagos/'}];
  const ui = fixture({responses: [invalid, municipalities]});
  await ui.type('pielagos');
  assert.equal(ui.links().length, 0);
  assert.match(ui.status.textContent, /No se pudo cargar/);
  await ui.type('piélagos');
  assert.equal(ui.calls(), 2);
  assert.equal(ui.links()[0].href, '/cantabria/pielagos/');
});

test('network and malformed JSON payload failures remain recoverable', async () => {
  const ui = fixture({responses: [new Error('offline'), {unexpected: true}, municipalities]});
  await ui.type('guenes');
  assert.match(ui.status.textContent, /No se pudo cargar/);
  await ui.focus();
  assert.match(ui.status.textContent, /No se pudo cargar/);
  await ui.type('güeñes');
  assert.equal(ui.links()[0].href, '/bizkaia/guenes/');
  assert.equal(ui.calls(), 3);
});

test('results cap at eight, and Escape clears without intercepting other keys', async () => {
  const list = Array.from({length: 12}, (_, i) => record(`San Pueblo ${i}`, 'Navarra', 'navarra', `san-pueblo-${i}`));
  const ui = fixture({responses: [list]});
  await ui.type('san');
  assert.equal(ui.links().length, 8);
  assert.match(ui.status.textContent, /8 de 12/);
  let prevented = 0;
  ui.widget.dispatch('keydown', {key: 'ArrowDown', preventDefault: () => prevented++});
  assert.equal(prevented, 0);
  ui.widget.dispatch('keydown', {key: 'Escape', preventDefault: () => prevented++});
  assert.equal(prevented, 1);
  assert.equal(ui.input.value, '');
  assert.equal(ui.links().length, 0);
  assert.equal(ui.input.focused, true);
});
