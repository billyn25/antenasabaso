export const provinces = [
  {
    name: "Bizkaia",
    slug: "bizkaia",
    towns: ["Abadiño","Abanto y Ciérvana-Abanto Zierbena","Ajangiz","Alonsotegi","Amorebieta-Etxano","Amoroto","Arakaldo","Arantzazu","Areatza","Arrankudiaga-Zollo","Arratzu","Arrieta","Arrigorriaga","Artea","Artzentales","Atxondo","Aulesti","Bakio","Balmaseda","Barakaldo","Barrika","Basauri","Bedia","Berango","Bermeo","Berriatua","Berriz","Bilbao","Busturia","Derio","Dima","Durango","Ea","Elantxobe","Elorrio","Erandio","Ereño","Ermua","Errigoiti","Etxebarri","Etxebarria","Forua","Fruiz","Galdakao","Galdames","Gamiz-Fika","Garai","Gatika","Gautegiz Arteaga","Gernika-Lumo","Getxo","Gizaburuaga","Gordexola","Gorliz","Güeñes","Ibarrangelu","Igorre","Ispaster","Iurreta","Izurtza","Karrantza Harana/Valle de Carranza","Kortezubi","Lanestosa","Larrabetzu","Laukiz","Leioa","Lekeitio","Lemoa","Lemoiz","Lezama","Loiu","Mallabia","Mañaria","Markina-Xemein","Maruri-Jatabe","Mendata","Mendexa","Meñaka","Morga","Mundaka","Mungia","Munitibar-Arbatzegi Gerrikaitz","Murueta","Muskiz","Muxika","Nabarniz","Ondarroa","Orozko","Ortuella","Otxandio","Plentzia","Portugalete","Santurtzi","Sestao","Sondika","Sopela","Sopuerta","Sukarrieta","Trucios-Turtzioz","Ubide","Ugao-Miraballes","Urduliz","Urduña/Orduña","Usansolo","Valle de Trápaga-Trapagaran","Zaldibar","Zalla","Zamudio","Zaratamo","Zeanuri","Zeberio","Zierbena","Ziortza-Bolibar"]
  },
  {
    name: "Gipuzkoa",
    slug: "gipuzkoa",
    towns: ["Abaltzisketa","Aduna","Aia","Aizarnazabal","Albiztur","Alegia","Alkiza","Altzaga","Altzo","Amezketa","Andoain","Anoeta","Antzuola","Arama","Aretxabaleta","Arrasate/Mondragón","Asteasu","Astigarraga","Ataun","Azkoitia","Azpeitia","Baliarrain","Beasain","Beizama","Belauntza","Berastegi","Bergara","Berrobi","Bidania-Goiatz","Deba","Donostia/San Sebastián","Eibar","Elduain","Elgeta","Elgoibar","Errenteria","Errezil","Eskoriatza","Ezkio-Itsaso","Gabiria","Gaintza","Gaztelu","Getaria","Hernani","Hernialde","Hondarribia","Ibarra","Idiazabal","Ikaztegieta","Irun","Irura","Itsasondo","Larraul","Lasarte-Oria","Lazkao","Leaburu","Legazpi","Legorreta","Leintz-Gatzaga","Lezo","Lizartza","Mendaro","Mutiloa","Mutriku","Oiartzun","Olaberria","Oñati","Ordizia","Orendain","Orexa","Orio","Ormaiztegi","Pasaia","Segura","Soraluze-Placencia de las Armas","Tolosa","Urnieta","Urretxu","Usurbil","Villabona","Zaldibia","Zarautz","Zegama","Zerain","Zestoa","Zizurkil","Zumaia","Zumarraga"]
  },
  {
    name: "Álava",
    slug: "alava",
    towns: ["Agurain/Salvatierra","Alegría-Dulantzi","Amurrio","Añana","Aramaio","Armiñón","Arraia-Maeztu","Arratzua-Ubarrundia","Artziniega","Asparrena","Ayala/Aiara","Baños de Ebro/Mañueta","Barrundia","Berantevilla","Bernedo","Campezo/Kanpezu","Elburgo/Burgelu","Elciego","Elvillar/Bilar","Erriberagoitia/Ribera Alta","Harana/Valle de Arana","Iruña Oka/Iruña de Oca","Iruraiz-Gauna","Kripan","Kuartango","Labastida/Bastida","Lagrán","Laguardia","Lanciego/Lantziego","Lantarón","Lapuebla de Labarca","Laudio/Llodio","Legutio","Leza","Moreda de Álava/Moreda Araba","Navaridas","Okondo","Oyón-Oion","Peñacerrada-Urizaharra","Ribera Baja/Erriberabeitia","Samaniego","San Millán/Donemiliaga","Urkabustaiz","Valdegovía/Gaubea","Villabuena de Álava/Eskuernaga","Vitoria-Gasteiz","Yécora/Iekora","Zalduondo","Zambrana","Zigoitia","Zuia"]
  }
];

export const totalTowns = provinces.reduce((sum, province) => sum + province.towns.length, 0);
