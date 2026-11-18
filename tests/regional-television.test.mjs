import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import reception from '../content/local-reception.json' with {type:'json'};
import television from '../content/regional-television.json' with {type:'json'};
import {provinces} from '../content/municipios.mjs';
import {renderTownReception} from '../scripts/local-reception.mjs';
import {townRegionalSignals} from '../scripts/regional-television.mjs';

const siteScript = fs.readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const etbServices = new Map([
  ['tv:etb1', 'ETB1'], ['tv:etb2', 'ETB2'],
  ['tv:etb1-on', 'ETB1 ON'], ['tv:etb2-on', 'ETB2 ON']
]);

function attributes(markup) {
  return Object.fromEntries([...markup.matchAll(/([\w-]+)="([^"]*)"/g)]
    .map(([, name, value]) => [name, value]));
}

function townPage(provinceSlug, town) {
  const province = provinces.find(item => item.slug === provinceSlug);
  const html = renderTownReception(province, town);
  const rows = [...html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)]
    .map(([, attrs, content]) => ({attrs: attributes(attrs), content}))
    .filter(row => row.attrs['data-tdt-mux'])
    .map(row => ({
      ...row,
      dataset: Object.fromEntries(Object.entries(row.attrs)
        .filter(([name]) => name.startsWith('data-'))
        .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]))
    }));
  const options = new Map([...html.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)]
    .map(([, attrs, label]) => [attributes(attrs).value, label]));
  const signals = townRegionalSignals(provinceSlug, reception.towns[provinceSlug][town], reception.zones);
  return {html, rows, options, signals};
}

function rowHasService(row, service) {
  return (row.dataset.tdtServices || '').split(' ').includes(service);
}

// Exercise the complete browser script using rows parsed from real rendered
// pages. The fixture supplies DOM/event behavior, not the selector algorithm.
function clientFixture(datasets) {
  const handlers = new Map();
  const select = {value: '', selectedOptions: []};
  const result = {textContent: ''};
  const rows = datasets.map(dataset => {
    const row = {dataset, highlighted: false};
    row.classList = {toggle(name, active) {
      assert.equal(name, 'tdt-selected');
      row.highlighted = active;
    }};
    return row;
  });
  const section = {querySelectorAll: () => rows};
  const form = {
    hidden: true,
    closest: () => section,
    querySelector: selector => selector === 'select' ? select : result,
    addEventListener: (name, handler) => handlers.set(name, handler)
  };
  const document = {
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-tdt-finder]' ? [form] : []
  };
  vm.runInNewContext(siteScript, {document});
  return {
    form, result, rows,
    submit(value, label) {
      select.value = value;
      select.selectedOptions = [{textContent: label}];
      let prevented = false;
      handlers.get('submit')({preventDefault() { prevented = true; }});
      assert.ok(prevented);
    }
  };
}

test('ETB has its four current choices and the correct MAUT in Zalla, Donostia and Vitoria', () => {
  for (const [province, town, uhf, mhz] of [
    ['bizkaia', 'Zalla', '35', '586'],
    ['gipuzkoa', 'Donostia/San Sebastián', '48', '690'],
    ['alava', 'Vitoria-Gasteiz', '45', '666']
  ]) {
    const page = townPage(province, town);
    for (const [id, label] of etbServices) assert.equal(page.options.get(id), label, town);
    assert.ok(!page.options.has('tv:etb3') && !page.options.has('tv:etb4'));
    const etbRows = page.rows.filter(row => rowHasService(row, 'tv:etb1'));
    assert.equal(etbRows.length, 1, town);
    const row = etbRows[0];
    assert.equal(row.dataset.tdtMux, 'MAUT');
    assert.equal(row.dataset.tdtUhf, uhf);
    assert.equal(row.dataset.tdtMhz, mhz);
    for (const service of etbServices.keys()) assert.ok(rowHasService(row, service));
    const signal = page.signals.find(item => item.services.includes('etb1'));
    assert.equal(signal.uhf, Number(uhf));
    assert.equal(signal.inPlan, true);
  }
});

test('Artziniega retains planned MAUT 24 but ETB requests coverage without inheriting its frequency', () => {
  const page = townPage('alava', 'Artziniega');
  const planned = page.rows.find(row => row.dataset.tdtMux === 'MAUT' && row.dataset.tdtZone === 'Burgos Norte');
  assert.ok(planned);
  assert.equal(planned.dataset.tdtUhf, '24');
  assert.equal(planned.dataset.tdtMhz, '498');
  assert.ok(!rowHasService(planned, 'tv:etb1'));
  const signal = page.signals.find(item => item.services.includes('etb1'));
  assert.equal(signal.uhf, null);
  assert.equal(signal.inPlan, false);
  const etbRow = page.rows.find(row => rowHasService(row, 'tv:etb1'));
  assert.ok(etbRow);
  assert.equal(etbRow.dataset.tdtUhf, undefined);
  assert.equal(etbRow.dataset.tdtMhz, undefined);
  assert.match(etbRow.content, /Consultar/);
  const client = clientFixture(page.rows.map(row => row.dataset));
  client.submit('tv:etb1', 'ETB1');
  assert.match(client.result.textContent, /ETB1/);
  assert.match(client.result.textContent, /consulta.*cobertura/i);
  assert.doesNotMatch(client.result.textContent, /UHF\s*24|NaN|undefined/);
  assert.equal(client.rows.find(row => row.dataset === planned.dataset).highlighted, false);
  assert.equal(client.rows.find(row => row.dataset === etbRow.dataset).highlighted, true);
});

test('Berberana does not inherit ETB from its Bizkaia technical area', () => {
  const page = townPage('burgos', 'Berberana');
  assert.ok(reception.towns.burgos.Berberana.zones.includes('Bizkaia Este'));
  assert.ok(page.rows.some(row => row.dataset.tdtMux === 'MAUT' && row.dataset.tdtUhf === '35'));
  for (const id of etbServices.keys()) {
    assert.ok(!page.options.has(id));
    assert.ok(page.rows.every(row => !rowHasService(row, id)));
  }
  assert.ok(page.signals.every(signal => !signal.services.includes('etb1')));
});

test('Hamaika has separate local rows in the three verified capitals, without spreading locals to Zalla', () => {
  for (const [province, town, uhf, mhz] of [
    ['bizkaia', 'Bilbao', '23', '490'],
    ['gipuzkoa', 'Donostia/San Sebastián', '23', '490'],
    ['alava', 'Vitoria-Gasteiz', '42', '642']
  ]) {
    const page = townPage(province, town);
    assert.equal(page.options.get('tv:hamaika'), 'Hamaika Telebista');
    const localRows = page.rows.filter(row => rowHasService(row, 'tv:hamaika'));
    assert.equal(localRows.length, 1, town);
    assert.equal(localRows[0].dataset.tdtMux, 'Local');
    assert.equal(localRows[0].dataset.tdtUhf, uhf);
    assert.equal(localRows[0].dataset.tdtMhz, mhz);
    assert.ok(page.rows.filter(row => row.dataset.tdtMux === 'MAUT')
      .every(row => !rowHasService(row, 'tv:hamaika')));
    const signal = page.signals.find(item => item.services.includes('hamaika'));
    assert.equal(signal.scope, 'local');
    assert.equal(signal.inPlan, false);
  }
  const zalla = townPage('bizkaia', 'Zalla');
  for (const id of ['tv:hamaika', 'tv:tele7', 'tv:telebilbao']) assert.ok(!zalla.options.has(id));
  assert.ok(!zalla.signals.some(signal => signal.scope === 'local'));
  // New valid regional/local records remain allowed; obsolete UHF 50 does not.
  for (const signal of television.local) {
    assert.ok(signal.uhf === null || (Number.isInteger(signal.uhf) && signal.uhf >= 21 && signal.uhf <= 48), signal.id);
  }
});

test('the real selector matches a service rather than every regional row sharing MAUT, and clears highlights', () => {
  const page = townPage('bizkaia', 'Zalla');
  const otherRegional = {
    tdtMux: 'MAUT', tdtZone: 'Zona de prueba', tdtServices: 'tv:autonomica-prueba',
    tdtUhf: '42', tdtMhz: '642'
  };
  const client = clientFixture([...page.rows.map(row => row.dataset), otherRegional]);
  assert.equal(client.form.hidden, false);
  client.submit('tv:etb1', 'ETB1');
  assert.match(client.result.textContent, /UHF 35 \(586 MHz\)/);
  assert.doesNotMatch(client.result.textContent, /Zona de prueba|UHF 42/);
  assert.deepEqual(client.rows.filter(row => row.highlighted).map(row => row.dataset.tdtUhf), ['35']);
  client.submit('tv:autonomica-prueba', 'Autonómica de prueba');
  assert.match(client.result.textContent, /UHF 42 \(642 MHz\)/);
  assert.doesNotMatch(client.result.textContent, /UHF 35/);
  assert.deepEqual(client.rows.filter(row => row.highlighted).map(row => row.dataset.tdtUhf), ['42']);
  client.submit('', '');
  assert.ok(client.rows.every(row => !row.highlighted));
});

test('the real selector distinguishes local frequency from ETB and keeps unconfirmed local reception separate', () => {
  const page = townPage('bizkaia', 'Bilbao');
  const client = clientFixture(page.rows.map(row => row.dataset));
  client.submit('tv:etb1', 'ETB1');
  assert.match(client.result.textContent, /UHF 35/);
  client.submit('tv:hamaika', 'Hamaika Telebista');
  assert.match(client.result.textContent, /Hamaika Telebista · Local/);
  assert.match(client.result.textContent, /UHF 23 \(490 MHz\)/);
  assert.doesNotMatch(client.result.textContent, /UHF 35/);
  assert.deepEqual(client.rows.filter(row => row.highlighted).map(row => row.dataset.tdtUhf), ['23']);
  client.submit('tv:telebilbao', 'TeleBilbao');
  assert.match(client.result.textContent, /TeleBilbao/);
  assert.match(client.result.textContent, /consulta.*cobertura/i);
  assert.doesNotMatch(client.result.textContent, /UHF\s*\d|NaN|undefined/);
  assert.ok(client.rows.filter(row => row.highlighted)
    .every(row => rowHasService(row, 'tv:telebilbao')));
  client.submit('', '');
  assert.ok(client.rows.every(row => !row.highlighted));
});
