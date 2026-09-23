// Comarcas oficiales de Eustat. Usansolo se incorpora a Gran Bilbao.
export const comarcaGroups = {
  bizkaia: {
    'Arratia-Nerbioi / Arratia-Nervión': ["Arakaldo","Arantzazu","Areatza","Arrankudiaga-Zollo","Artea","Dima","Igorre","Orozko","Otxandio","Ubide","Ugao-Miraballes","Urduña/Orduña","Zeanuri","Zeberio"],
    'Bilbo Handia / Gran Bilbao': ["Abanto y Ciérvana-Abanto Zierbena","Alonsotegi","Arrigorriaga","Barakaldo","Basauri","Berango","Bilbao","Derio","Erandio","Etxebarri","Galdakao","Getxo","Larrabetzu","Leioa","Lezama","Loiu","Muskiz","Ortuella","Portugalete","Santurtzi","Sestao","Sondika","Valle de Trápaga-Trapagaran","Zamudio","Zaratamo","Zierbena","Usansolo"],
    'Durangaldea / Duranguesado': ["Abadiño","Amorebieta-Etxano","Atxondo","Bedia","Berriz","Durango","Elorrio","Ermua","Garai","Iurreta","Izurtza","Lemoa","Mallabia","Mañaria","Zaldibar"],
    'Enkartazioak / Encartaciones': ["Artzentales","Balmaseda","Galdames","Gordexola","Güeñes","Karrantza Harana/Valle de Carranza","Lanestosa","Sopuerta","Trucios-Turtzioz","Zalla"],
    'Gernika-Bermeo': ["Ajangiz","Arratzu","Bermeo","Busturia","Ea","Elantxobe","Ereño","Errigoiti","Forua","Gautegiz Arteaga","Gernika-Lumo","Ibarrangelu","Kortezubi","Mendata","Morga","Mundaka","Murueta","Muxika","Nabarniz","Sukarrieta"],
    'Markina-Ondarroa': ["Amoroto","Aulesti","Berriatua","Etxebarria","Gizaburuaga","Ispaster","Lekeitio","Markina-Xemein","Mendexa","Munitibar-Arbatzegi Gerrikaitz","Ondarroa","Ziortza-Bolibar"],
    'Plentzia-Mungia': ["Arrieta","Bakio","Barrika","Fruiz","Gamiz-Fika","Gatika","Gorliz","Laukiz","Lemoiz","Maruri-Jatabe","Meñaka","Mungia","Plentzia","Sopela","Urduliz"]
  },
  gipuzkoa: {
    'Bidasoa Beherea / Bajo Bidasoa': ["Hondarribia","Irun"],
    'Debabarrena / Bajo Deba': ["Deba","Eibar","Elgoibar","Mendaro","Mutriku","Soraluze-Placencia de las Armas"],
    'Debagoiena / Alto Deba': ["Antzuola","Aretxabaleta","Arrasate/Mondragón","Bergara","Elgeta","Eskoriatza","Leintz-Gatzaga","Oñati"],
    'Donostialdea': ["Andoain","Astigarraga","Donostia/San Sebastián","Errenteria","Hernani","Lasarte-Oria","Lezo","Oiartzun","Pasaia","Urnieta","Usurbil"],
    'Goierri': ["Altzaga","Arama","Ataun","Beasain","Ezkio-Itsaso","Gabiria","Gaintza","Idiazabal","Itsasondo","Lazkao","Legazpi","Mutiloa","Olaberria","Ordizia","Ormaiztegi","Segura","Urretxu","Zaldibia","Zegama","Zerain","Zumarraga"],
    'Tolosaldea': ["Abaltzisketa","Aduna","Albiztur","Alegia","Alkiza","Altzo","Amezketa","Anoeta","Asteasu","Baliarrain","Belauntza","Berastegi","Berrobi","Bidania-Goiatz","Elduain","Gaztelu","Hernialde","Ibarra","Ikaztegieta","Irura","Larraul","Leaburu","Legorreta","Lizartza","Orendain","Orexa","Tolosa","Villabona","Zizurkil"],
    'Urola Kosta': ["Aia","Aizarnazabal","Azkoitia","Azpeitia","Beizama","Errezil","Getaria","Orio","Zarautz","Zestoa","Zumaia"]
  },
  alava: {
    'Arabako Ibarrak / Valles Alaveses': ["Añana","Armiñón","Berantevilla","Kuartango","Lantarón","Erriberagoitia/Ribera Alta","Ribera Baja/Erriberabeitia","Valdegovía/Gaubea","Zambrana"],
    'Arabako Lautada / Llanada Alavesa': ["Alegría-Dulantzi","Arratzua-Ubarrundia","Asparrena","Barrundia","Elburgo/Burgelu","Iruña Oka/Iruña de Oca","Iruraiz-Gauna","Agurain/Salvatierra","San Millán/Donemiliaga","Vitoria-Gasteiz","Zalduondo"],
    'Arabako Mendialdea / Montaña Alavesa': ["Arraia-Maeztu","Bernedo","Campezo/Kanpezu","Harana/Valle de Arana","Lagrán","Peñacerrada-Urizaharra"],
    'Arabako Errioxa / Rioja Alavesa': ["Baños de Ebro/Mañueta","Elciego","Elvillar/Bilar","Kripan","Labastida/Bastida","Laguardia","Lanciego/Lantziego","Lapuebla de Labarca","Leza","Moreda de Álava/Moreda Araba","Navaridas","Oyón-Oion","Samaniego","Villabuena de Álava/Eskuernaga","Yécora/Iekora"],
    'Gorbeialdea / Estribaciones del Gorbea': ["Aramaio","Legutio","Urkabustaiz","Zigoitia","Zuia"],
    'Arabako Kantaurialdea / Cantábrica Alavesa': ["Amurrio","Artziniega","Ayala/Aiara","Laudio/Llodio","Okondo"]
  }
};

export function comarcaFor(provinceSlug,town){
  const groups=comarcaGroups[provinceSlug]||{};
  for(const [name,towns] of Object.entries(groups)) if(towns.includes(town)) return name;
  return '';
}

export function townsInComarca(provinceSlug,town){
  const name=comarcaFor(provinceSlug,town);
  return name ? comarcaGroups[provinceSlug][name] : [];
}
