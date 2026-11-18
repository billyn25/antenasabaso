import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {provinces} from '../content/municipios.mjs';
import {renderTownReception,renderProvinceReception,reviewed} from '../scripts/local-reception.mjs';

const siteScript=fs.readFileSync(new URL('../site.js',import.meta.url),'utf8');
function fixture(rows){
  const callbacks={};
  const select={value:'',selectedOptions:[]};
  const result={textContent:''};
  const renderedRows=rows.map(dataset=>({dataset,highlighted:false,classList:{toggle(name,active){assert.equal(name,'tdt-selected');this.owner.highlighted=active;}}}));
  for(const row of renderedRows) row.classList.owner=row;
  const section={querySelectorAll:()=>renderedRows};
  const form={hidden:true,closest:()=>section,querySelector:selector=>selector==='select'?select:result,addEventListener:(name,cb)=>{callbacks[name]=cb;}};
  const document={querySelector:()=>null,querySelectorAll:selector=>selector==='[data-tdt-finder]'?[form]:[]};
  vm.runInNewContext(siteScript,{document});
  return {form,select,result,rows:renderedRows,submit(mux,channel){select.value=mux;select.selectedOptions=[{textContent:channel}];let prevented=false;callbacks.submit({preventDefault(){prevented=true;}});assert(prevented);}};
}
test('table frequencies are complete without JavaScript and the helper is initially hidden',()=>{
  const province=provinces.find(p=>p.slug==='bizkaia');
  const h=renderTownReception(province,'Zalla');
  assert.match(h,/data-tdt-finder hidden/);
  assert.equal((h.match(/data-tdt-finder/g)||[]).length,1);
  assert.equal((h.match(/data-tdt-mux=/g)||[]).length,8);
  assert(h.includes('<td>482</td>'));
  assert(h.includes('<option value="MPE5">La Séptima</option>'));
  assert(h.includes('<option value="RGE2">La 1 UHD</option>'));
  assert(!h.includes('<option value="MAUT">'));
  assert(h.includes('#ai-2'));
  assert(h.includes(`<time datetime="${reviewed}">17/11/2026</time>`));
  assert(!renderProvinceReception(province).includes('data-tdt-finder'));
});
test('selecting a chain shows its local MUX, highlights matching rows and clears the previous choice',()=>{
  const x=fixture([
    {tdtMux:'MPE5',tdtZone:'Bizkaia Oeste',tdtUhf:'26',tdtMhz:'514'},
    {tdtMux:'RGE2',tdtZone:'Bizkaia Oeste',tdtUhf:'28',tdtMhz:'530'}
  ]);
  assert.equal(x.form.hidden,false);
  x.submit('MPE5','La Séptima');
  assert.match(x.result.textContent,/La Séptima · MPE5/);
  assert.match(x.result.textContent,/UHF 26 \(514 MHz\)/);
  assert.deepEqual(x.rows.map(r=>r.highlighted),[true,false]);
  x.submit('RGE2','La 1 UHD');
  assert.match(x.result.textContent,/UHF 28 \(530 MHz\)/);
  assert.match(x.result.textContent,/DVB-T2 y HEVC\/H.265/);
  assert.match(x.result.textContent,/depende del repetidor/);
  assert.deepEqual(x.rows.map(r=>r.highlighted),[false,true]);
  x.submit('','');
  assert.deepEqual(x.rows.map(r=>r.highlighted),[false,false]);
});
test('all relevant zones are reported, and a helper without tables remains inactive',()=>{
  const x=fixture([
    {tdtMux:'MPE5',tdtZone:'Zona A',tdtUhf:'26',tdtMhz:'514'},
    {tdtMux:'MPE5',tdtZone:'Zona B',tdtUhf:'32',tdtMhz:'562'}
  ]);
  x.submit('MPE5','DKISS');
  assert.match(x.result.textContent,/Zona A: UHF 26 \(514 MHz\)/);
  assert.match(x.result.textContent,/Zona B: UHF 32 \(562 MHz\)/);
  assert.equal(fixture([]).form.hidden,true);
});
