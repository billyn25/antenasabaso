import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../content/local-reception.json' with {type:'json'};
import {provinces,totalTowns} from '../content/municipios.mjs';
import {townReception,frequencyMHz,distanceKm,nearestTowns,renderTownReception,renderProvinceReception,programmes} from '../scripts/local-reception.mjs';

test('every published municipality has a unique INE code, coordinates and complete frequency plan',()=>{
  const codes=new Set();
  for(const p of provinces) for(const town of p.towns){
    const r=townReception(p.slug,town);
    assert.match(r.ine,/^\d{5}$/);assert(!codes.has(r.ine));codes.add(r.ine);
    assert(r.coordinates[0]>40 && r.coordinates[0]<44);
    assert(r.coordinates[1]>-8 && r.coordinates[1]<0);
    assert(r.zones.length>0);
    for(const z of r.zones){assert.equal(data.zones[z].length,8);for(const c of data.zones[z])assert(c>=21&&c<=48);}
  }
  assert.equal(codes.size,totalTowns);
});
test('technical zones follow BOE municipalities, including cross-province assignments',()=>{
  const cases=[['bizkaia','Zalla','Bizkaia Oeste'],['bizkaia','Lekeitio','Gipuzkoa'],['alava','Amurrio','Bizkaia Este'],['alava','Artziniega','Burgos Norte'],['burgos','Aranda de Duero','Burgos Sur'],['burgos','Burgos','Burgos Norte'],['leon','León','León Este'],['leon','Ponferrada','León Oeste']];
  for(const [p,t,z] of cases)assert(townReception(p,t).zones.includes(z),`${p}/${t}`);
  assert.deepEqual(data.zones['Bizkaia Oeste'],[22,28,36,38,21,27,26,35]);
  assert.deepEqual(data.zones['Burgos Sur'],[45,38,32,48,31,39,30,35]);
});
test('UHF conversion and measured distances use correct units',()=>{
  assert.equal(frequencyMHz(21),474);assert.equal(frequencyMHz(48),690);
  assert.throws(()=>frequencyMHz(69));
  assert.equal(distanceKm([43,-3],[43,-3]),0);
  assert(Math.abs(distanceKm([0,0],[0,1])-111.195)<.01);
});
test('six nearby towns are ordered, distinct, existing and geographically closest',()=>{
  const all=provinces.flatMap(p=>p.towns.map(t=>({p:p.slug,t,...townReception(p.slug,t)})));
  for(const p of provinces)for(const t of p.towns){
    const near=nearestTowns(p.slug,t);assert.equal(near.length,6);assert.equal(new Set(near.map(x=>x.ine)).size,6);
    const origin=townReception(p.slug,t);assert(near.every(x=>x.ine!==origin.ine));
    assert(near.every((x,i)=>i===0||x.km>=near[i-1].km));
    const chosen=new Set(near.map(x=>x.ine));
    assert(all.filter(x=>x.ine!==origin.ine&&!chosen.has(x.ine)).every(x=>distanceKm(origin.coordinates,x.coordinates)>=near[5].km-1e-8));
  }
});
test('local HTML includes frequencies without JavaScript and November programme moves',()=>{
  const p=provinces.find(x=>x.slug==='bizkaia'),html=renderTownReception(p,'Zalla');
  assert(html.includes('Zona técnica: Bizkaia Oeste'));assert(html.includes('UHF 22'));assert(html.includes('UHF 26'));
  assert(html.includes('<td>482</td>'));assert(!html.includes('<script'));
  assert(programmes.MPE4.includes('Boing'));assert(programmes.MPE5.includes('La Séptima'));
  assert(programmes.MPE2.includes('A3Series'));assert(programmes.MPE3.includes('BeMad'));assert(programmes.RGE1.includes('Clan'));
  for(const province of provinces)assert(renderProvinceReception(province).includes('<table'));
});
