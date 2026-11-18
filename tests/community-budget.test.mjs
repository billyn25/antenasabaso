import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const linkAttributes = [...home.matchAll(/<a\b[^>]*\bdata-home-service="[^"]*"[^>]*>/g)]
  .map(([tag]) => Object.fromEntries([...tag.matchAll(/\b([\w-]+)="([^"]*)"/g)]
    .map(([, name, value]) => [name, value])));

function eventTarget() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
    },
    dispatch(type, event = {preventDefault() {}}) {
      for (const handler of handlers.get(type) || []) handler(event);
    }
  };
}

function harness({withProperty = true} = {}) {
  const fields = Object.fromEntries(Object.entries({
    service: 'Portero automático',
    province: 'Álava',
    town: 'Amurrio',
    problem: 'El portal 2 no recibe imagen; el resto funciona.',
    ...(withProperty ? {property: 'Comercio o negocio'} : {})
  }).map(([name, value]) => [name, {value}]));
  const outbound = [];
  const form = Object.assign(eventTarget(), {
    hidden: true,
    querySelector: selector => fields[selector.match(/^\[name="([^"]+)"\]$/)?.[1]] || null,
    submit: () => outbound.push('form.submit'),
    requestSubmit: () => outbound.push('form.requestSubmit'),
    reset: () => { for (const field of Object.values(fields)) field.value = ''; }
  });
  const links = linkAttributes.map(attributes => Object.assign(eventTarget(), {
    getAttribute: name => attributes[name] ?? null
  }));
  const location = {
    get href() { return 'https://antenasabaso.com/'; },
    set href(value) { outbound.push(['navigate', value]); }
  };
  const document = {
    querySelector: selector => selector === '[data-budget-form]' ? form : null,
    querySelectorAll: selector => selector === '[data-home-service]' ? links : []
  };
  vm.runInNewContext(script, {
    document,
    window: {location, open: (...args) => outbound.push(['open', ...args])},
    navigator: {sendBeacon: (...args) => { outbound.push(['beacon', ...args]); return true; }},
    fetch: (...args) => { outbound.push(['fetch', ...args]); return Promise.resolve({ok: true}); },
    FormData: class {
      constructor(target) { assert.equal(target, form); }
      get(name) { return fields[name]?.value ?? null; }
    }
  });
  return {fields, links, outbound};
}

function assertEnteredDetailsRemain(fields) {
  assert.equal(fields.province.value, 'Álava');
  assert.equal(fields.town.value, 'Amurrio');
  assert.equal(fields.problem.value, 'El portal 2 no recibe imagen; el resto funciona.');
}

for (const service of ['Antenas TDT', 'Videoportero']) {
  test(`community CTA selects ${service} and community without clearing details or sending`, () => {
    const {fields, links, outbound} = harness();
    const matches = links.filter(link => link.getAttribute('data-home-service') === service &&
      link.getAttribute('data-home-property') === 'Comunidad de vecinos');
    assert.equal(matches.length, 1, 'The community CTA must be present in the real home page');
    assert.equal(matches[0].getAttribute('href'), '#formulario');
    matches[0].dispatch('click');
    assert.equal(fields.service.value, service);
    assert.equal(fields.property.value, 'Comunidad de vecinos');
    assertEnteredDetailsRemain(fields);
    assert.deepEqual(outbound, []);
  });
}

test('existing service links preserve the manually chosen property and entered details', () => {
  const {fields, links, outbound} = harness();
  const existingLinks = links.filter(link => link.getAttribute('data-home-property') === null);
  assert.ok(existingLinks.length > 0, 'Exercise the existing links from the real home page');
  for (const link of existingLinks) {
    link.dispatch('click');
    assert.equal(fields.service.value, link.getAttribute('data-home-service'));
    assert.equal(fields.property.value, 'Comercio o negocio');
    assertEnteredDetailsRemain(fields);
  }
  assert.deepEqual(outbound, []);
});

test('community links still select a service when the optional property field is absent', () => {
  const {fields, links, outbound} = harness({withProperty: false});
  const communityLinks = links.filter(link => link.getAttribute('data-home-property') === 'Comunidad de vecinos');
  assert.equal(communityLinks.length, 2);
  for (const link of communityLinks) {
    assert.doesNotThrow(() => link.dispatch('click'));
    assert.equal(fields.service.value, link.getAttribute('data-home-service'));
    assertEnteredDetailsRemain(fields);
  }
  assert.deepEqual(outbound, []);
});
