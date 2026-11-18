import television from '../content/regional-television.json' with {type:'json'};

export const regionalReviewed = television.reviewed;
export const regionalServices = television.services;
export const regionalSources = television.sources;

// The national technical area can cross autonomous-community boundaries.
// Only attach programme names to a frequency when both scopes are supported.
function autonomousSignals(province, zones, zoneChannels) {
  const network=television.networks.find(n=>n.provinces.includes(province));
  if(!network) return [];
  const supported=zones.filter(zone=>network.zones.includes(zone));
  const base={id:network.id,mux:'MAUT',scope:'autonomic',services:network.services,sources:network.sources,note:network.note||'',planned:!!network.planned};
  if(!supported.length) return [{...base,area:network.area,uhf:null,inPlan:false}];
  return supported.map(zone=>({...base,area:zone,uhf:zoneChannels[zone][7],inPlan:true}));
}

export function townRegionalSignals(province, record, zoneChannels) {
  return [...autonomousSignals(province,record.zones,zoneChannels),
    ...television.local.filter(n=>n.province===province && n.ine.includes(record.ine))
      .map(n=>({...n,mux:'Local',scope:'local',inPlan:false}))];
}

export function provinceRegionalSignals(province, zones, zoneChannels) {
  return [...autonomousSignals(province,zones,zoneChannels),
    ...television.local.filter(n=>n.province===province)
      .map(n=>({...n,mux:'Local',scope:'local',inPlan:false}))];
}

export function regionalSourceList(signals) {
  return [...new Set(signals.flatMap(signal=>signal.sources))].map(id=>{
    const source=regionalSources[id];
    if(!source) throw Error(`Fuente de televisión regional desconocida: ${id}`);
    return source;
  });
}

export function regionalServiceName(id) {
  const service=regionalServices[id];
  if(!service) throw Error(`Cadena regional desconocida: ${id}`);
  return service.name;
}
