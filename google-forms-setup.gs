/**
 * Ian Eksamen-Plan — Google Forms + Sheet bootstrapper (variant-weergawe).
 *
 * Reël: Slaagpunt = 80% op ELKE toets. Maks 3 pogings; daarna "kry hulp".
 * Toets 1, 2, 3 toets DIESELFDE konsepte met ander bewoording (variante A/B/C).
 *
 * Hoe om dit te gebruik:
 *   - Gaan na https://script.google.com → open jou bestaande projek (of nuwe)
 *   - VERVANG die hele Code.gs met hierdie leêr
 *   - Hardloop `veeAllesUit_GEVAAR` om die ou vorms na die asblik te stuur
 *   - Hardloop `bouAlles` om die nuwe variant-vorms te skep
 *   - View → Logs vir die nuwe URLs (33 vorms + 1 sheet)
 *   - Plak die nuwe FORM_URLS in c:/Users/quint/ian-eksamen-plan/index.html
 *   - Publiseer die nuwe sheet (File → Share → Publish to web → CSV) en update MASTER_CSV_URL
 *
 * INDIEN die 33 vorms reeds bestaan (m.a.w. bouAlles is reeds gehardloop sonder
 * die onFormSubmit-sneller en die Tellings-blad bly leeg):
 *   - Hardloop EEN keer `konsolideerInstellings()` in die Apps Script-redakteur.
 *   - Dit koppel die sneller aan elke bestaande vorm sodat elke submissie
 *     onmiddellik in die Tellings-blad land — met die korrekte vak en poging.
 *   - Toets dit deur 'n vorm in te dien; die ry behoort binne sekondes in
 *     Tellings te wys (en op die webwerf na die volgende verfris).
 *
 * INDIEN Ian reeds toetse ingedien het VOORDAT die sneller geïnstalleer is
 * (die ou data sit dan vasgevang in 'Form Responses N'-tabbe), hardloop
 * EEN keer `migreerOuSubmissies()` om dit in Tellings te kopieer. Dedupli-
 * keer outomaties op (vak, poging, tydstempel), dus veilig om weer te doen.
 */

const SHEET_NAAM = 'Ian — Eksamen Tellings';
const TELLINGS_BLAD = 'Tellings';
const TELLINGS_KOP = ['Timestamp', 'Vak', 'Poging', 'Telling', 'UitOf'];
// Script Properties sleutels — die onFormSubmit-snellermap onthou waar elke form se
// resultate moet land. Sonder hierdie map sou submissies in 'Form Responses N'-tabbe
// versuip i.p.v. in Tellings (wat die enigste blad is wat die webwerf lees).
const PROP_FORM_MAP = 'IAN_FORM_NA_VAK_POGING';
const PROP_MASTER_SHEET_ID = 'IAN_MASTER_SHEET_ID';
const VAKKE = [
  { kode: 'wiskunde1',   etiket: 'Wiskunde Vraestel 1',     stub: true  },
  { kode: 'wiskunde2',   etiket: 'Wiskunde Vraestel 2',     stub: true  },
  { kode: 'afrikaans',   etiket: 'Afrikaans Huistaal',      stub: true  },
  { kode: 'tegnologie',  etiket: 'Tegnologie',              stub: false },
  { kode: 'ebw',         etiket: 'EBW',                     stub: false },
  { kode: 'kuns',        etiket: 'Kuns en Kultuur',         stub: true  },
  { kode: 'natuur',      etiket: 'Natuurwetenskap',         stub: false },
  { kode: 'geografie',   etiket: 'Geografie',               stub: true  },
  { kode: 'geskiedenis', etiket: 'Geskiedenis',             stub: true  },
  { kode: 'engels',      etiket: 'Engels EAT',              stub: true  },
  { kode: 'lewens',      etiket: 'Lewensvaardighede',       stub: true  }
];
const POGINGS = [
  { nommer: 1, etiket: 'Toets 1', poel: 'A' },
  { nommer: 2, etiket: 'Toets 2', poel: 'B' },
  { nommer: 3, etiket: 'Toets 3', poel: 'C' }
];
const SLAAGPUNT = 80;

// ===== MCQ-VARIANTE per flitskaart-konsep =====
// Elke kaart het variante A (Toets 1), B (Toets 2), C (Toets 3).
// Alle 20 konsepte word in elke toets getoets — net met ander bewoording.
const QUIZ_DATA = {
  ebw: [
    { konsep: "Rekeningkunde", variante: {
      A: { vraag: "Wat is Rekeningkunde?", antwoord: "'n Sistematiese proses wat besighede help om ingeligte besluite te neem.", afleiers: ["Die handeling om kontant in 'n besigheid se kluis te tel.", "'n Maandelikse staat wat die bank aan klante stuur.", "Die wet wat besighede dwing om belasting te betaal."] },
      B: { vraag: "Watter beskrywing pas die beste by Rekeningkunde?", antwoord: "Dit help die besigheid om data te versamel, transaksies te registreer en aan die eienaar te rapporteer.", afleiers: ["Dit beheer net die salarisse van werknemers.", "Dit handel net oor die berekening van belasting elke maand.", "Dit is die proses om produkte aan klante te verkoop."] },
      C: { vraag: "'n Eienaar wil weet hoe sy besigheid presteer. Watter aktiwiteit gee hom hierdie inligting?", antwoord: "Rekeningkunde — versamel data, registreer transaksies, rapporteer aan die eienaar.", afleiers: ["Bemarking — adverteer die produk aan kliënte.", "Aankope — bestel voorraad by verskaffers.", "Verspreiding — stuur produkte na winkels."] }
    }},
    { konsep: "3 tipes Kapitaal", variante: {
      A: { vraag: "Watter van die volgende is NIE 'n tipe Kapitaal nie?", antwoord: "Tydelike Kapitaal", afleiers: ["Eie Kapitaal", "Geleende Kapitaal", "Fisiese Kapitaal"] },
      B: { vraag: "Sarah lê R20 000 van haar eie spaargeld in 'n besigheid in. Watter tipe kapitaal is dit?", antwoord: "Eie Kapitaal (Ekwiteit)", afleiers: ["Geleende Kapitaal", "Fisiese Kapitaal", "Tydelike Kapitaal"] },
      C: { vraag: "'n Bakkery koop 'n nuwe industriële oond en 'n aflewerings-bakkie. Hierdie items word saam genoem...", antwoord: "Fisiese Kapitaal", afleiers: ["Eie Kapitaal", "Geleende Kapitaal", "Surplus-kapitaal"] }
    }},
    { konsep: "Bates", variante: {
      A: { vraag: "Wat is Bates?", antwoord: "Items wat deur die besigheid besit word en waarde het.", afleiers: ["Skuld wat 'n besigheid aan ander betaal moet word.", "Die maandelikse salaris van die eienaar.", "Belasting wat aan SARS betaalbaar is."] },
      B: { vraag: "Watter een van die volgende is 'n voorbeeld van 'n Bate?", antwoord: "'n Voertuig wat die besigheid besit", afleiers: ["'n Lening wat by die bank afbetaal moet word", "'n Maandelikse huurkontrak", "'n Skuld aan 'n verskaffer"] },
      C: { vraag: "Hoe beïnvloed Bates die waarde van 'n besigheid?", antwoord: "Bates verhoog die waarde van die besigheid.", afleiers: ["Bates verminder die waarde van die besigheid.", "Bates het geen invloed op die waarde van die besigheid nie.", "Bates verhoog die besigheid se laste."] }
    }},
    { konsep: "Vaste vs Bedryfsbates", variante: {
      A: { vraag: "Watter van die volgende is 'n VASTE bate?", antwoord: "'n Aflewerings-bakkie", afleiers: ["Kontant in die kluis", "Aandele in 'n ander maatskappy", "Skuldenaars wat geld nog moet betaal"] },
      B: { vraag: "Watter van die volgende is 'n BEDRYFSBATE?", antwoord: "Kontant in die bank", afleiers: ["Die winkelgebou", "Toerusting wat 10 jaar gebruik word", "'n Aflewerings-bakkie"] },
      C: { vraag: "Wat is die hoofverskil tussen 'n Vaste bate en 'n Bedryfsbate?", antwoord: "Vaste bates word langtermyn gebruik; bedryfsbates kan vinnig in kontant omskakel word.", afleiers: ["Vaste bates is duurder; bedryfsbates is goedkoper.", "Vaste bates is in die kantoor; bedryfsbates is in die pakhuis.", "Vaste bates verloor waarde; bedryfsbates wen waarde."] }
    }},
    { konsep: "Laste", variante: {
      A: { vraag: "Wat is Laste?", antwoord: "Skuld wat 'n besigheid moet betaal — verminder die waarde van die besigheid.", afleiers: ["Geld wat die besigheid in die bank het.", "Die wins wat aan die eienaar uitbetaal word.", "Bates wat in 'n langtermyn-belegging gesit is."] },
      B: { vraag: "Watter een van die volgende is 'n voorbeeld van 'n Las?", antwoord: "'n Banklening wat afbetaal moet word", afleiers: ["'n Voertuig wat die besigheid besit", "Kontant in die kasregister", "Voorraad in die pakhuis"] },
      C: { vraag: "Hoe beïnvloed Laste die waarde van 'n besigheid?", antwoord: "Laste verminder die waarde van die besigheid.", afleiers: ["Laste verhoog die waarde van die besigheid.", "Laste het geen invloed nie.", "Laste verhoog die besigheid se kontantvloei."] }
    }},
    { konsep: "Langtermyn vs Lopende verpligtinge", variante: {
      A: { vraag: "Watter is 'n LANGTERMYN-verpligting?", antwoord: "'n Verbandlening oor 20 jaar", afleiers: ["'n Klere-rekening wat oor 6 maande afbetaal word", "'n Oortrokke bankrekening", "Skuldeisers wat binne 30 dae betaal moet word"] },
      B: { vraag: "Watter is 'n LOPENDE verpligting?", antwoord: "'n Klere-rekening wat oor 3 maande afbetaal moet word", afleiers: ["'n Verbandlening oor 20 jaar", "'n Langtermynlening van die bank oor 5 jaar", "'n Aandele-lening oor 10 jaar"] },
      C: { vraag: "Wat is die 'magiese lyn' wat langtermyn van lopende verpligtinge skei?", antwoord: "12 maande", afleiers: ["6 maande", "24 maande", "5 jaar"] }
    }},
    { konsep: "Wins / Verlies-formule", variante: {
      A: { vraag: "Wins of Verlies word bereken as:", antwoord: "Inkomste − Uitgawes", afleiers: ["Bates − Laste", "Inkomste + Uitgawes", "Bates + Eie Kapitaal"] },
      B: { vraag: "'n Besigheid verdien R50 000 inkomste en het R35 000 uitgawes. Wat is die wins?", antwoord: "R15 000 wins", afleiers: ["R85 000 wins", "R15 000 verlies", "R35 000 wins"] },
      C: { vraag: "'n Besigheid se uitgawes is R40 000 en sy inkomste is R30 000. Wat is die uitkoms?", antwoord: "R10 000 verlies", afleiers: ["R10 000 wins", "R70 000 wins", "R40 000 verlies"] }
    }},
    { konsep: "Basiese Rekeningkundige Vergelyking", variante: {
      A: { vraag: "Wat is die Basiese Rekeningkundige Vergelyking?", antwoord: "Bates = Laste + Eienaarsbelang", afleiers: ["Bates = Inkomste − Uitgawes", "Wins = Bates − Laste", "Kapitaal = Bates + Laste"] },
      B: { vraag: "'n Besigheid het R200 000 in bates en R80 000 in laste. Wat is die eienaarsbelang?", antwoord: "R120 000", afleiers: ["R280 000", "R80 000", "R200 000"] },
      C: { vraag: "Volgens die rekeningkundige vergelyking, watter stelling is korrek?", antwoord: "Eienaarsbelang = Bates − Laste", afleiers: ["Eienaarsbelang = Bates + Laste", "Bates = Eienaarsbelang − Laste", "Laste = Bates + Eienaarsbelang"] }
    }},
    { konsep: "5 tipes Persoonlike Inkomste", variante: {
      A: { vraag: "Watter van die volgende is NIE 'n tipe Persoonlike Inkomste nie?", antwoord: "Belastingteruggawe", afleiers: ["Salaris", "Lone", "Kommissie"] },
      B: { vraag: "Pieter werk R45 per uur in 'n koffiewinkel. Watter tipe inkomste verdien hy?", antwoord: "Lone (per uur gewerk)", afleiers: ["Salaris (vaste maandelikse bedrag)", "Kommissie (% van verkope)", "Huurinkomste"] },
      C: { vraag: "Sarah verkoop motors en kry 5% van elke verkoop. Watter tipe inkomste is dit?", antwoord: "Kommissie (% van verkope)", afleiers: ["Salaris", "Lone (per uur)", "Informele inkomste"] }
    }},
    { konsep: "Netto Waarde", variante: {
      A: { vraag: "Hoe word Netto Waarde bereken?", antwoord: "Bates − Laste", afleiers: ["Inkomste − Uitgawes", "Bates + Laste", "Inkomste − Belasting"] },
      B: { vraag: "Jan het R150 000 se bates en R40 000 se skuld. Wat is sy netto waarde?", antwoord: "R110 000", afleiers: ["R190 000", "R40 000", "R150 000"] },
      C: { vraag: "Wat wys jou Netto Waarde vir jou?", antwoord: "Hoe ryk jy op 'n spesifieke oomblik is.", afleiers: ["Hoeveel jy hierdie maand verdien.", "Hoeveel belasting jy hierdie jaar betaal het.", "Hoeveel jy in jou bankrekening het."] }
    }},
    { konsep: "Bruto vs Netto Wins", variante: {
      A: { vraag: "Wat is die verskil tussen Bruto Wins en Netto Wins?", antwoord: "Bruto trek slegs koste van verkope af; Netto trek ALLE uitgawes af.", afleiers: ["Bruto trek ALLE uitgawes af; Netto trek net belasting af.", "Bruto en Netto is dieselfde ding.", "Bruto = wins voor verkope; Netto = wins na verkope."] },
      B: { vraag: "'n Winkel koop voorraad teen R100 en verkoop dit teen R250. Wat is die Bruto Wins?", antwoord: "R150", afleiers: ["R250", "R100", "R350"] },
      C: { vraag: "'n Besigheid het R10 000 Bruto Wins, maar betaal R3 000 huur en R2 000 salarisse. Wat is die Netto Wins?", antwoord: "R5 000", afleiers: ["R10 000", "R15 000", "R3 000"] }
    }},
    { konsep: "Vaste vs Veranderlike Koste", variante: {
      A: { vraag: "Watter van die volgende is 'n VASTE koste?", antwoord: "Maandelikse huur vir die winkel", afleiers: ["Elektrisiteit wat met gebruik wissel", "Voorraad wat aangevul word", "Vergoeding van tydelike werkers"] },
      B: { vraag: "Watter van die volgende is 'n VERANDERLIKE koste?", antwoord: "Elektrisiteit wat met gebruik wissel", afleiers: ["Maandelikse winkelhuur", "Vaste salaris van die bestuurder", "Versekeringspremies"] },
      C: { vraag: "Wat is die hoofverskil tussen Vaste en Veranderlike Koste?", antwoord: "Vaste koste bly dieselfde elke maand; veranderlike koste wissel met aktiwiteit.", afleiers: ["Vaste koste is altyd duurder.", "Veranderlike koste word net een keer per jaar betaal.", "Vaste koste is opsioneel; veranderlike koste is verpligtend."] }
    }},
    { konsep: "Surplusbegroting", variante: {
      A: { vraag: "Watter tipe begroting is dit wanneer Inkomste > Uitgawes?", antwoord: "Surplusbegroting", afleiers: ["Tekortbegroting", "Gebalanseerde begroting", "Kapitaalbegroting"] },
      B: { vraag: "'n Familie verdien R25 000 per maand en hul uitgawes is R20 000. Watter tipe begroting het hulle?", antwoord: "Surplusbegroting", afleiers: ["Tekortbegroting", "Gebalanseerde begroting", "Bedryfsbegroting"] },
      C: { vraag: "Wat is die voordeel van 'n Surplusbegroting?", antwoord: "Daar bly geld oor om te spaar of te belê.", afleiers: ["Jy moet skuld maak om uitgawes te dek.", "Jy moet jou uitgawes verminder.", "Jy het presies genoeg geld vir uitgawes."] }
    }},
    { konsep: "Kort- vs Langtermynbegroting", variante: {
      A: { vraag: "Hoe lank dek 'n Langtermynbegroting (volgens jou handboek)?", antwoord: "3 jaar", afleiers: ["1 jaar", "6 maande", "10 jaar"] },
      B: { vraag: "Hoe lank dek 'n Korttermynbegroting?", antwoord: "1 jaar", afleiers: ["3 jaar", "5 jaar", "6 weke"] },
      C: { vraag: "Pa beplan vir die volgende 3 jaar se inkomste en uitgawes vir die plaas. Watter tipe begroting is dit?", antwoord: "Langtermynbegroting", afleiers: ["Korttermynbegroting", "Bedryfsbegroting", "Kontantbegroting"] }
    }},
    { konsep: "4 Stappe om begroting op te stel", variante: {
      A: { vraag: "Watter een van die volgende is NIE 'n stap om 'n begroting op te stel nie?", antwoord: "Bereken belasting voor inkomste", afleiers: ["Lys al die inkomste-items", "Lys al die uitgawe-items", "Tel totale op en kry die verskil"] },
      B: { vraag: "Wat is die EERSTE stap om 'n begroting op te stel?", antwoord: "Lys al die inkomste-items", afleiers: ["Tel totale op", "Lys uitgawes", "Bereken die verskil"] },
      C: { vraag: "Wat is die LAASTE stap om 'n begroting op te stel?", antwoord: "Bereken die verskil tussen inkomste en uitgawes (dit is jou spaargeld).", afleiers: ["Lys uitgawes", "Lys inkomste", "Tel die inkomste-items op"] }
    }},
    { konsep: "Bedryfs- vs Kapitaalbegroting", variante: {
      A: { vraag: "Wat is die verskil tussen 'n Bedryfsbegroting en 'n Kapitaalbegroting?", antwoord: "Bedryf = roetine besigheidsuitgawes; Kapitaal = langtermyn-bates soos masjinerie.", afleiers: ["Bedryf = langtermyn-bates; Kapitaal = daaglikse uitgawes.", "Bedryf is vir persone, Kapitaal is vir besighede.", "Bedryf is jaarliks, Kapitaal is maandeliks."] },
      B: { vraag: "'n Besigheid begroot vir huur, salarisse en elektrisiteit. Watter soort begroting is dit?", antwoord: "Bedryfsbegroting", afleiers: ["Kapitaalbegroting", "Surplusbegroting", "Persoonlike begroting"] },
      C: { vraag: "'n Fabriek beplan om R500 000 te spandeer op 'n nuwe industriële masjien. Watter soort begroting word gebruik?", antwoord: "Kapitaalbegroting", afleiers: ["Bedryfsbegroting", "Tekortbegroting", "Lopende begroting"] }
    }},
    { konsep: "Eenmansaak", variante: {
      A: { vraag: "Wat is 'n Eenmansaak?", antwoord: "'n Besigheid met net EEN eienaar wat al die wins kry en vir alle skulde verantwoordelik is.", afleiers: ["'n Besigheid met twee vennote wat wins deel.", "'n Maatskappy waarvan die aandele op die beurs verhandel.", "'n Nie-winsgewende organisasie."] },
      B: { vraag: "Oom Jannie bestuur sy eie bakkery alleen. Al die wins is syne, maar hy is ook persoonlik verantwoordelik vir alle skulde. Watter besigheidsvorm is dit?", antwoord: "Eenmansaak (Alleen-eienaar)", afleiers: ["Vennootskap", "Beslote Korporasie", "Publieke maatskappy"] },
      C: { vraag: "Wat is die GROOTSTE risiko van 'n Eenmansaak?", antwoord: "Die eienaar is persoonlik verantwoordelik vir al die besigheid se skulde.", afleiers: ["Die eienaar mag geen winste behou nie.", "Die eienaar moet die besigheid binne 1 jaar verkoop.", "Die eienaar betaal dubbele belasting."] }
    }},
    { konsep: "Brondokument", variante: {
      A: { vraag: "Watter van die volgende is 'n voorbeeld van 'n Brondokument?", antwoord: "'n Kwitansie van 'n verkoop", afleiers: ["'n Plakkaat in die winkel se venster", "'n Telefoonoproep aan 'n verskaffer", "'n SMS-aanbevelings van 'n vriend"] },
      B: { vraag: "Wat is die hoofdoel van 'n Brondokument?", antwoord: "Om te bewys dat 'n transaksie plaasgevind het.", afleiers: ["Om die werknemers op te lei.", "Om die produk te adverteer.", "Om belasting outomaties te bereken."] },
      C: { vraag: "Watter van die volgende is NIE 'n Brondokument nie?", antwoord: "'n Mondelinge belofte tussen twee mense", afleiers: ["'n Kwitansie", "'n Bankstaat", "'n Faktuur"] }
    }},
    { konsep: "Behoeftes vs Begeertes", variante: {
      A: { vraag: "Watter een is 'n BEHOEFTE (nie 'n begeerte nie)?", antwoord: "Kos om te eet", afleiers: ["'n Luukse motor", "'n Vakansie oorsee", "'n Nuwe selfoon"] },
      B: { vraag: "Watter een is 'n BEGEERTE (nie 'n behoefte nie)?", antwoord: "'n Luukse selfoon", afleiers: ["Kos", "Skuiling", "Drinkbare water"] },
      C: { vraag: "Wat is die hoofverskil tussen Behoeftes en Begeertes?", antwoord: "Behoeftes is nodig om te lewe; begeertes is dinge wat ons wil hê.", afleiers: ["Behoeftes is duurder as begeertes.", "Begeertes is verpligtend; behoeftes is opsioneel.", "Behoeftes verander; begeertes bly altyd dieselfde."] }
    }},
    { konsep: "Rekeningkundige Siklus", variante: {
      A: { vraag: "Wat is die KORREKTE volgorde van die Rekeningkundige Siklus?", antwoord: "Identifiseer → Versamel brondokumente → Rekordeer → Oorboek → Stel state op → Rapporteer", afleiers: ["Rapporteer → Identifiseer → Rekordeer → Oorboek → Versamel → Stel op", "Versamel → Identifiseer → Stel op → Oorboek → Rekordeer → Rapporteer", "Stel op → Rapporteer → Identifiseer → Rekordeer → Versamel → Oorboek"] },
      B: { vraag: "Hoeveel stappe is daar in die Rekeningkundige Siklus?", antwoord: "6 stappe", afleiers: ["4 stappe", "5 stappe", "8 stappe"] },
      C: { vraag: "Wat is die LAASTE stap van die Rekeningkundige Siklus?", antwoord: "Rapporteer aan die eienaar", afleiers: ["Identifiseer transaksies", "Stel finansiële state op", "Versamel brondokumente"] }
    }}
  ],
  natuur: [
    { konsep: "Biosfeer", variante: {
      A: { vraag: "Wat is die Biosfeer?", antwoord: "Al die ekosisteme van die Aarde waar lewende organismes gevind word.", afleiers: ["Net die oseane en seë van die Aarde.", "Die laag rotse onder die grond.", "Die laag wolke om die Aarde."] },
      B: { vraag: "Die woord 'Biosfeer' beteken letterlik...", antwoord: "'lewensbal' — al die plekke op Aarde waar lewe bestaan.", afleiers: ["'klipbal' — al die rotse op Aarde.", "'lugbal' — al die gasse om die Aarde.", "'waterbal' — al die oseane en mere."] },
      C: { vraag: "Watter stelling beskryf die Biosfeer die beste?", antwoord: "Dit sluit lewende organismes en hul ekosisteme in.", afleiers: ["Dit is net die diere wat in die see leef.", "Dit is die laag wolke wat reën maak.", "Dit is die warm laag onder die grond."] }
    }},
    { konsep: "3 dele van die biosfeer", variante: {
      A: { vraag: "Watter is NIE 'n deel van die biosfeer nie?", antwoord: "Stratosfeer", afleiers: ["Hidrosfeer", "Litosfeer", "Atmosfeer"] },
      B: { vraag: "Hoeveel hoofdele het die Biosfeer?", antwoord: "3 (Hidrosfeer, Litosfeer, Atmosfeer)", afleiers: ["2", "4", "5"] },
      C: { vraag: "Die letters H-L-A help jou onthou die 3 dele van die biosfeer. Wat verteenwoordig dit?", antwoord: "Hidrosfeer (water), Litosfeer (grond), Atmosfeer (lug)", afleiers: ["Hitte, Lewe, Aarde", "Hoog, Laag, Atmosfeer", "Habitat, Lewe, Aktief"] }
    }},
    { konsep: "Hidrosfeer", variante: {
      A: { vraag: "Wat is die HIDROSFEER?", antwoord: "Al die water op Aarde: oseane, mere, riviere en ondergrondse water.", afleiers: ["Al die rotse en grond van die Aarde.", "Die gaslaag wat die Aarde omring.", "Net die water in plante en diere."] },
      B: { vraag: "Watter van die volgende is NIE deel van die Hidrosfeer nie?", antwoord: "Berg-rotse", afleiers: ["Oseane", "Riviere", "Ondergrondse water"] },
      C: { vraag: "Die voorvoegsel 'Hidro' kom uit Grieks en beteken...", antwoord: "Water", afleiers: ["Klip", "Lug", "Vuur"] }
    }},
    { konsep: "Litosfeer", variante: {
      A: { vraag: "Wat is die LITOSFEER?", antwoord: "Die grond en rotse van die Aarde.", afleiers: ["Al die water op Aarde.", "Die laag gasse om die Aarde.", "Die binneste kern van die Aarde."] },
      B: { vraag: "Watter een van die volgende is deel van die Litosfeer?", antwoord: "'n Berg gemaak van graniet", afleiers: ["'n Wolk in die lug", "Sout in seewater", "'n Rivier vol vis"] },
      C: { vraag: "Die voorvoegsel 'Lito' beteken in Grieks...", antwoord: "Klip / steen", afleiers: ["Water", "Lug", "Lewe"] }
    }},
    { konsep: "Atmosfeer", variante: {
      A: { vraag: "Wat is die ATMOSFEER?", antwoord: "Die laag gasse wat die Aarde omring.", afleiers: ["Al die grond en klippe van die Aarde.", "Al die oseane saam.", "Die warm laag onder die grond."] },
      B: { vraag: "Watter een van die volgende behoort tot die Atmosfeer?", antwoord: "Suurstof en koolstofdioksied in die lug", afleiers: ["Vis in 'n rivier", "Klippe op 'n berg", "Sand op 'n strand"] },
      C: { vraag: "Hoekom is die Atmosfeer belangrik vir lewe?", antwoord: "Dit voorsien die gasse (soos O₂ en CO₂) wat lewende organismes nodig het.", afleiers: ["Dit voorsien vaste rotse om op te bou.", "Dit gee water vir oseane.", "Dit verskaf grond vir plante om te groei."] }
    }},
    { konsep: "7 Lewensprosesse", variante: {
      A: { vraag: "Watter van die volgende is NIE een van die 7 Lewensprosesse nie?", antwoord: "Fotosintese", afleiers: ["Voeding", "Asemhaling", "Sensitiwiteit"] },
      B: { vraag: "Hoeveel Lewensprosesse is daar in totaal?", antwoord: "7", afleiers: ["5", "6", "8"] },
      C: { vraag: "Watter twee Lewensprosesse handel oor REAKSIE op die omgewing en BEWEGING?", antwoord: "Sensitiwiteit en Beweging", afleiers: ["Voeding en Asemhaling", "Voortplanting en Groei", "Uitskeiding en Voeding"] }
    }},
    { konsep: "5 Vereistes vir Lewe", variante: {
      A: { vraag: "Watter is NIE een van die 5 Vereistes vir Lewe nie?", antwoord: "Skuiling", afleiers: ["Water", "Grond", "Temperatuur"] },
      B: { vraag: "Hoeveel basiese Vereistes is daar vir die volhouding van lewe?", antwoord: "5", afleiers: ["3", "4", "7"] },
      C: { vraag: "Sonlig vir plante en voedsel vir diere val onder watter vereiste?", antwoord: "Energiebron", afleiers: ["Water", "Grond", "Gasse uit die atmosfeer"] }
    }},
    { konsep: "Energiebron vir plante", variante: {
      A: { vraag: "Waar kry plante hul energie vandaan?", antwoord: "Van die Son (vir fotosintese)", afleiers: ["Uit die grond se minerale", "Uit voedsel wat hulle vreet", "Uit reënwater"] },
      B: { vraag: "Watter proses gebruik plante om sonlig in voedsel te omskakel?", antwoord: "Fotosintese", afleiers: ["Asemhaling", "Verdamping", "Voortplanting"] },
      C: { vraag: "Diere kry hul energie uit voedsel. Plante kry hul energie uit...?", antwoord: "Die son", afleiers: ["Die grond", "Reënwater", "Die maan"] }
    }},
    { konsep: "Gas vir Fotosintese (CO₂)", variante: {
      A: { vraag: "Watter gas gebruik plante vir FOTOSINTESE?", antwoord: "Koolstofdioksied (CO₂)", afleiers: ["Suurstof (O₂)", "Stikstof (N₂)", "Waterstof (H₂)"] },
      B: { vraag: "Plante neem CO₂ in en stel watter gas vry?", antwoord: "Suurstof (O₂)", afleiers: ["Stikstof (N₂)", "Helium (He)", "Meer koolstofdioksied"] },
      C: { vraag: "Hoekom is plante so belangrik vir die atmosfeer?", antwoord: "Hulle neem CO₂ op en stel O₂ vry, wat diere benodig om asem te haal.", afleiers: ["Hulle stel meer CO₂ in die lug vry.", "Hulle neem suurstof op en stel CO₂ vry.", "Hulle skep nuwe water vir die oseane."] }
    }},
    { konsep: "Gas vir Asemhaling (O₂)", variante: {
      A: { vraag: "Watter gas gebruik diere om asem te haal?", antwoord: "Suurstof (O₂)", afleiers: ["Koolstofdioksied (CO₂)", "Stikstof (N₂)", "Helium (He)"] },
      B: { vraag: "Diere asem O₂ IN en stel watter gas UIT?", antwoord: "Koolstofdioksied (CO₂)", afleiers: ["Suurstof (O₂)", "Stikstof (N₂)", "Waterstof (H₂)"] },
      C: { vraag: "Hoekom is die plant-en-dier-siklus belangrik?", antwoord: "Plante en diere ruil O₂ en CO₂ — hulle hou mekaar aan die lewe.", afleiers: ["Plante en diere gebruik dieselfde gas.", "Diere stel suurstof vir plante vry.", "Plante het glad nie gasse nodig nie."] }
    }},
    { konsep: "Biodiversiteit", variante: {
      A: { vraag: "Wat is Biodiversiteit?", antwoord: "Al die lewende organismes EN hul habitatte op Aarde.", afleiers: ["Net die diere in 'n bepaalde land.", "Die verskil tussen plante en diere.", "Die studie van uitsterwende spesies."] },
      B: { vraag: "Die woord 'Biodiversiteit' bestaan uit twee dele. Wat beteken dit?", antwoord: "'Bio' = lewe, 'Diversiteit' = verskeidenheid", afleiers: ["'Bio' = groot, 'Diversiteit' = klein", "'Bio' = water, 'Diversiteit' = land", "'Bio' = plante, 'Diversiteit' = diere"] },
      C: { vraag: "Hoekom is hoë biodiversiteit goed vir die planeet?", antwoord: "Meer verskeidenheid van lewe maak ekosisteme sterker en meer stabiel.", afleiers: ["Dit beteken minder spesies kompeteer om kos.", "Dit verminder die hoeveelheid water op Aarde.", "Dit verseker dat net een spesie oorleef."] }
    }},
    { konsep: "5 Ryke", variante: {
      A: { vraag: "Watter van die volgende is NIE een van die 5 Ryke nie?", antwoord: "Insekte", afleiers: ["Bakterieë", "Swamme (Fungi)", "Protiste"] },
      B: { vraag: "Hoeveel Ryke van lewende organismes is daar?", antwoord: "5", afleiers: ["3", "4", "7"] },
      C: { vraag: "Watter ryk sluit 'n sampioen in?", antwoord: "Swamme (Fungi)", afleiers: ["Plante", "Diere", "Bakterieë"] }
    }},
    { konsep: "Klassifikasie-volgorde", variante: {
      A: { vraag: "Wat is die KORREKTE klassifikasie-volgorde van GROOT na KLEIN?", antwoord: "Ryk → Phylum → Klas → Orde → Familie → Genus → Spesie", afleiers: ["Spesie → Genus → Familie → Orde → Klas → Phylum → Ryk", "Ryk → Klas → Phylum → Familie → Orde → Spesie → Genus", "Phylum → Ryk → Orde → Klas → Genus → Familie → Spesie"] },
      B: { vraag: "Watter is die GROOTSTE (mees algemene) klassifikasie-vlak?", antwoord: "Ryk", afleiers: ["Spesie", "Genus", "Familie"] },
      C: { vraag: "Watter is die KLEINSTE (mees spesifieke) klassifikasie-vlak?", antwoord: "Spesie", afleiers: ["Ryk", "Phylum", "Klas"] }
    }},
    { konsep: "Wetenskaplike naam van die leeu", variante: {
      A: { vraag: "Wat is die wetenskaplike naam van die LEEU?", antwoord: "Panthera leo", afleiers: ["Panthera pardus", "Felis leo", "Leo panthera"] },
      B: { vraag: "In die naam 'Panthera leo' — wat verteenwoordig 'Panthera'?", antwoord: "Die Genus (begin met 'n hoofletter)", afleiers: ["Die Spesie", "Die Ryk", "Die Familie"] },
      C: { vraag: "Die luiperd is 'Panthera pardus'. Wat het die leeu en luiperd in gemeen?", antwoord: "Hulle is in dieselfde Genus (Panthera) maar verskillende spesies.", afleiers: ["Hulle is dieselfde spesie.", "Hulle is in verskillende ryke.", "Hulle behoort aan verskillende families."] }
    }},
    { konsep: "Gewerwelde dier", variante: {
      A: { vraag: "Wat is 'n GEWERWELDE dier?", antwoord: "'n Dier met 'n endoskelet (binneskelet / ruggraat).", afleiers: ["'n Dier met 'n eksoskelet (buiteskelet).", "'n Dier sonder enige skelet.", "'n Dier wat net in water leef."] },
      B: { vraag: "Watter een van die volgende is 'n GEWERWELDE dier?", antwoord: "'n Padda", afleiers: ["'n Spinnekop", "'n Wurm", "'n Krap"] },
      C: { vraag: "Wat is die hoofkenmerk wat 'n gewerwelde van 'n ongewerwelde dier onderskei?", antwoord: "'n Ruggraat (binneskelet)", afleiers: ["Die vermoë om te swem", "Vier bene", "Vere of hare"] }
    }},
    { konsep: "Ongewerwelde dier", variante: {
      A: { vraag: "Watter van die volgende is 'n ONGEWERWELDE dier?", antwoord: "'n Spinnekop", afleiers: ["'n Padda", "'n Slang", "'n Vis"] },
      B: { vraag: "Wat is die kenmerk van 'n ONGEWERWELDE dier?", antwoord: "'n Eksoskelet (buiteskelet) of geen skelet.", afleiers: ["'n Binneskelet (ruggraat).", "Vere en vlerke.", "Vier bene en hare."] },
      C: { vraag: "Watter groep is NIE ongewerwelde diere nie?", antwoord: "Voëls", afleiers: ["Insekte", "Slakke", "Wurms"] }
    }},
    { konsep: "Hoe haal visse asem", variante: {
      A: { vraag: "Hoe haal VISSE asem?", antwoord: "Deur kieue in die water.", afleiers: ["Deur longe op die land.", "Deur die vel terwyl hulle in modder lê.", "Deur 'n spesiale buis bo die water."] },
      B: { vraag: "Watter orgaan gebruik 'n vis om suurstof uit water te onttrek?", antwoord: "Kieue", afleiers: ["Longe", "Vel", "Vinne"] },
      C: { vraag: "Hoekom kan visse nie op land asemhaal nie?", antwoord: "Kieue werk net wanneer hulle nat is en suurstof uit water onttrek.", afleiers: ["Visse het te min energie om op land asem te haal.", "Visse se vinne werk nie buite water nie.", "Visse hou nie van die son nie."] }
    }},
    { konsep: "Eienskappe van visse", variante: {
      A: { vraag: "Watter van die volgende is NIE 'n eienskap van visse nie?", antwoord: "Warmbloedig (konstante liggaamstemperatuur)", afleiers: ["Vel met skubbe bedek", "Lê eiers in water", "Haal asem deur kieue"] },
      B: { vraag: "Watter een is 'n korrekte eienskap van visse?", antwoord: "Hulle is wisseltemperatuur (koudbloedig).", afleiers: ["Hulle is warmbloedig soos soogdiere.", "Hulle lê eiers op droë grond.", "Hulle het hare en vere."] },
      C: { vraag: "Visse se vel is dikwels met watter soort bedekking bedek?", antwoord: "Skubbe", afleiers: ["Vere", "Hare", "Mukus alleen"] }
    }},
    { konsep: "Hoe haal amfibieë asem", variante: {
      A: { vraag: "Hoe haal AMFIBIEË (paddas) asem?", antwoord: "As larwes met kieue; as volwassenes deur longe, vel en mondelinge mukus.", afleiers: ["Net deur kieue, hul hele lewe lank.", "Net deur longe, van geboorte af.", "Hulle haal glad nie asem nie — hulle absorbeer suurstof uit water."] },
      B: { vraag: "Hoe haal 'n padda-LARWE (jong padda in water) asem?", antwoord: "Met kieue", afleiers: ["Met longe", "Met sy vel alleen", "Met sy bek"] },
      C: { vraag: "Hoe haal 'n VOLWASSE padda op land asem?", antwoord: "Deur longe, vel en mondelinge mukus", afleiers: ["Net deur kieue", "Net deur sy bek", "Glad nie — hy hou sy asem op land"] }
    }},
    { konsep: "Eienskappe van amfibieë", variante: {
      A: { vraag: "Watter van die volgende is NIE 'n eienskap van amfibieë nie?", antwoord: "Vel bedek met skubbe", afleiers: ["Wisseltemperatuur (koudbloedig)", "Vogtige vel met slym", "Lê eiers in water"] },
      B: { vraag: "Waar lê amfibieë hul eiers?", antwoord: "In water", afleiers: ["Op droë grond", "In bome", "In sandduine"] },
      C: { vraag: "Hoekom moet 'n padda se vel altyd vogtig bly?", antwoord: "Sy vel help met asemhaling — dit werk net wanneer dit nat is.", afleiers: ["Sy vel is besig om af te skil.", "Sy vel verander van kleur in droë toestande.", "Sy vel is gemaak van skubbe wat water nodig het."] }
    }}
  ],
  tegnologie: [
    { konsep: "5 stappe van die ontwerpproses", variante: {
      A: { vraag: "Watter is die KORREKTE volgorde van die 5 stappe van die ontwerpproses?", antwoord: "Ondersoek → Ontwerp → Maak → Evalueer → Kommunikeer", afleiers: ["Ontwerp → Ondersoek → Maak → Kommunikeer → Evalueer", "Maak → Ontwerp → Ondersoek → Evalueer → Kommunikeer", "Ondersoek → Maak → Ontwerp → Kommunikeer → Evalueer"] },
      B: { vraag: "Hoeveel stappe is daar in die ontwerpproses?", antwoord: "5", afleiers: ["3", "4", "6"] },
      C: { vraag: "Onthou-woord 'OOMEK' help jou die ontwerpproses onthou. Wat staan die letters voor?", antwoord: "Ondersoek, Ontwerp, Maak, Evalueer, Kommunikeer", afleiers: ["Oplos, Ontwerp, Maak, Eet, Klaar", "Ondersoek, Onderhou, Meet, Evalueer, Kies", "Ontwerp, Organiseer, Maak, Eet, Kommunikeer"] }
    }},
    { konsep: "Ondersoek-stap", variante: {
      A: { vraag: "Wat doen jy tydens die ONDERSOEK-stap van die ontwerpproses?", antwoord: "Stel die feite vas — wat is die probleem of behoefte, en watter oplossings het ander reeds probeer.", afleiers: ["Maak die finale produk.", "Teken die gedetailleerde planne van die produk.", "Skryf 'n verslag oor hoe goed die produk werk."] },
      B: { vraag: "Hoekom is die Ondersoek-stap belangrik?", antwoord: "Dit spaar tyd en geld omdat jy leer uit ander se voorbeelde.", afleiers: ["Dit is die laaste stap waar jy die produk afwerk.", "Dit is wanneer jy die produk verkoop.", "Dit is nie belangrik nie — jy kan dit oorslaan."] },
      C: { vraag: "Tydens die Ondersoek-stap vra jy jouself...", antwoord: "Wat is die probleem en watter oplossings bestaan reeds?", afleiers: ["Hoe kan ek die produk vinniger maak?", "Hoeveel sal die produk kos om te koop?", "Wie gaan die produk gebruik?"] }
    }},
    { konsep: "Ontwerpopdrag", variante: {
      A: { vraag: "Wat is 'n ONTWERPOPDRAG?", antwoord: "'n Duidelike stelling wat sê wat die probleem of behoefte is en wat die ontwerper wil bereik.", afleiers: ["'n Lys van die materiale wat jy gaan gebruik.", "'n Skets van die finale produk.", "'n Tydlyn van wanneer die produk klaar moet wees."] },
      B: { vraag: "Die ontwerpopdrag word geskryf tydens watter stap van die ontwerpproses?", antwoord: "Ontwerp", afleiers: ["Ondersoek", "Maak", "Evalueer"] },
      C: { vraag: "Watter vraag word in die ONTWERPSPESIFIKASIES beantwoord?", antwoord: "Wie gaan dit gebruik? Sal dit veilig wees? Wat gaan dit kos? Sal dit die natuur beskadig?", afleiers: ["Hoe gaan jy die produk verkoop?", "Wanneer is die volgende kwartaal-toets?", "Hoeveel weeg die produk in kilogram?"] }
    }},
    { konsep: "Evalueer-stap", variante: {
      A: { vraag: "Wat doen jy tydens die EVALUEER-stap?", antwoord: "Kyk hoe goed die produk die probleem oplos en of daar maniere is om dit te verbeter.", afleiers: ["Maak die produk vir die eerste keer.", "Versamel inligting oor die probleem.", "Adverteer die produk aan kliënte."] },
      B: { vraag: "Tydens die KOMMUNIKEER-stap maak jy...", antwoord: "'n Deel van die ontwerpproses (notas, lyste, sketse) beskikbaar om die produk bekend te stel.", afleiers: ["Net 'n model — geen ander dokumente nie.", "'n Lys van die finansiële koste alleen.", "Niks — die produk verkoop homself."] },
      C: { vraag: "In watter stap word die vervaardigingsvolgorde (lys van stappe om die produk te maak) opgestel?", antwoord: "Maak", afleiers: ["Ondersoek", "Ontwerp", "Evalueer"] }
    }},
    { konsep: "Omtreklyne / sigbare lyne", variante: {
      A: { vraag: "Wat is OMTREKLYNE op 'n tekening?", antwoord: "Dik, donker en sigbare lyne wat die rand van die produk wys.", afleiers: ["Stippellyne wat versteekte dele wys.", "Dun lyne wat hulp gee om die middel te bepaal.", "Pyltjies wat afmetings aandui."] },
      B: { vraag: "Hoe word omtreklyne (sigbare lyne) geteken?", antwoord: "Dik en donker, in 'n volle (nie-gebreekte) lyn.", afleiers: ["Stippellyne (gebreekte lyne).", "Baie dun en lig.", "In rooi pen."] },
      C: { vraag: "Op 'n tegniese tekening — watter lyn-tipe wys die buitenste vorm van die voorwerp?", antwoord: "Omtreklyn (sigbare lyn)", afleiers: ["Konstruksielyn", "Verborge lyn (stippellyn)", "Afmetinglyn"] }
    }},
    { konsep: "Verborge lyne (stippellyne)", variante: {
      A: { vraag: "Wat wys VERBORGE LYNE op 'n tegniese tekening?", antwoord: "Dele van die produk wat nie sigbaar is nie (binne-in of agter ander dele).", afleiers: ["Die buite-rand van die produk.", "Die afmetings van die produk.", "Die kleur van die produk."] },
      B: { vraag: "Hoe word verborge lyne geteken?", antwoord: "Met kort gebreekte lyne (stippellyne).", afleiers: ["Met dik donker volle lyne.", "Met dun rooi lyne.", "Met pyltjies aan elke kant."] },
      C: { vraag: "Wanneer 'n verborge (gebreekte) lyn 'n sigbare lyn ontmoet, moet jy...", antwoord: "Die eerste stippie van die verborge lyn teen die sigbare lyn raak.", afleiers: ["'n Spasie laat tussen die twee lyne.", "Die sigbare lyn breek waar dit ontmoet.", "Die verborge lyn met 'n pyltjie eindig."] }
    }},
    { konsep: "Konstruksielyne", variante: {
      A: { vraag: "Wat is KONSTRUKSIELYNE?", antwoord: "Dun, lig lyne wat in die finale skets nie sigbaar is nie — hulle help om die middel of vorm te bepaal.", afleiers: ["Dik donker lyne wat die rand van die produk wys.", "Stippellyne wat versteekte dele wys.", "Lyne wat afmetings tussen punte aandui."] },
      B: { vraag: "Hoekom word konstruksielyne so lig geteken?", antwoord: "Sodat hulle nie in die finale skets sigbaar is nie — hulle is net hulp tydens die teken.", afleiers: ["Om papier te spaar.", "Omdat dit makliker is om te teken.", "Omdat 'n potlood nie donker lyne kan maak nie."] },
      C: { vraag: "Watter een van die volgende is 'n VOORBEELD van 'n konstruksielyn se gebruik?", antwoord: "Lyne wat help om die middel van 'n sirkel te bepaal voor jy dit teken.", afleiers: ["Die buite-rand van 'n blok wat geteken word.", "'n Pyltjie wat die hoogte van 'n meubelstuk aandui.", "'n Stippellyn wat 'n binne-laai wys."] }
    }},
    { konsep: "Afmetings (lengte, breedte, hoogte)", variante: {
      A: { vraag: "Watter DRIE afmetings beskryf 'n 3D-voorwerp?", antwoord: "Lengte, breedte, hoogte", afleiers: ["Lengte, gewig, hoogte", "Breedte, kleur, area", "Lengte, oppervlakte, volume"] },
      B: { vraag: "'n 2D-skets het net TWEE afmetings. Watter twee?", antwoord: "Breedte en hoogte", afleiers: ["Lengte en breedte", "Lengte en hoogte", "Hoogte en gewig"] },
      C: { vraag: "Op 'n tegniese tekening — hoeveel afmetings benodig jy om 'n boks volledig te beskryf?", antwoord: "3 (lengte, breedte en hoogte)", afleiers: ["1", "2", "4"] }
    }},
    { konsep: "Verdwynpunt", variante: {
      A: { vraag: "Wat is 'n VERDWYNPUNT op 'n tekening?", antwoord: "Die punt in die verte waar parallelle lyne mekaar ontmoet.", afleiers: ["Die middel van die voorwerp.", "Die plek waar die teken begin.", "Die kortste lyn op die skets."] },
      B: { vraag: "Hoekom lyk dinge wat verder weg is kleiner?", antwoord: "Omdat hulle nader aan die verdwynpunt is.", afleiers: ["Omdat hulle werklik krimp.", "Omdat papier hulle kleiner maak.", "Omdat 'n potlood nie ver lyne kan trek nie."] },
      C: { vraag: "Wat is die hoofdoel van 'n verdwynpunt op 'n perspektieftekening?", antwoord: "Om diepte en afstand te wys.", afleiers: ["Om kleur by te voeg.", "Om afmetings te bereken.", "Om die teken vinniger te maak."] }
    }},
    { konsep: "3D Artistieke tekeninge — tegnieke", variante: {
      A: { vraag: "Watter is NIE 'n tegniek wat in 3D ARTISTIEKE tekeninge gebruik word nie?", antwoord: "Afmetings (lengtes en hoogtes met getalle aandui)", afleiers: ["Kleur", "Tekstuur", "Beskaduwing"] },
      B: { vraag: "Hoe word KLEUR in 'n artistieke tekening gebruik om diepte te wys?", antwoord: "Goed wat verder weg is, raak ligter of donkerder.", afleiers: ["Alles kry dieselfde kleur.", "Net rooi en blou word gebruik.", "Kleur word net vir die hoof-voorwerp gebruik."] },
      C: { vraag: "BESKADUWING in 'n tekening word gebruik om...", antwoord: "Diepte en driedimensionele aspekte van voorwerpe te toon.", afleiers: ["Die tekening vinniger te maak.", "Te wys watter dele kleur het.", "Die afmetings te bereken."] }
    }},
    { konsep: "Wat is 'n struktuur?", variante: {
      A: { vraag: "Wat is 'n STRUKTUUR?", antwoord: "Iets wat gemaak is om iets anders te beskerm, te ondersteun en/of op te bring. Kan natuurlik of mensgemaak wees.", afleiers: ["Slegs iets wat deur mense gebou is.", "Slegs iets wat in die natuur voorkom.", "Slegs iets wat baie sterk is."] },
      B: { vraag: "'n Voëlnes is 'n voorbeeld van watter SOORT struktuur?", antwoord: "Natuurlike struktuur (deur diere gemaak)", afleiers: ["Mensgemaakte struktuur", "Soliede struktuur", "Geen struktuur nie"] },
      C: { vraag: "Watter is die DRIE hoof-soorte strukture?", antwoord: "Dop-, raam- en soliede strukture", afleiers: ["Plat, ronde en spits strukture", "Klein, medium en groot strukture", "Houtwerk-, staal- en betonstrukture"] }
    }},
    { konsep: "Dop-strukture", variante: {
      A: { vraag: "Wat is 'n DOP-struktuur?", antwoord: "'n Struktuur wat oor die algemeen gebuig of skuins is — 'n skil wat 'n ruimte omhul.", afleiers: ["Die binne-skelet van 'n gebou.", "'n Stapel van soliede materiaal.", "'n Plat struktuur wat op die grond lê."] },
      B: { vraag: "Watter een van die volgende is 'n voorbeeld van 'n dop-struktuur?", antwoord: "'n Eier", afleiers: ["'n Brug se staaldrade", "Die spinnerak", "'n Huis se muur"] },
      C: { vraag: "Wat is 'n VOORDEEL van 'n dop-struktuur?", antwoord: "Baie sterk — kan 'n groot oppervlakte oorhaak sonder pilare.", afleiers: ["Hulle is altyd goedkoper as ander strukture.", "Hulle is altyd ligter as raamstrukture.", "Hulle hou nooit water uit nie."] }
    }},
    { konsep: "Raamstrukture", variante: {
      A: { vraag: "Wat is 'n RAAMSTRUKTUUR?", antwoord: "'n Struktuur wat deur sy skelet (raamwerk) ondersteun word — nie deur soliede mure nie.", afleiers: ["'n Struktuur gemaak van 'n stapel materiaal.", "'n Struktuur sonder enige ondersteuning.", "'n Struktuur wat altyd uit hout gemaak is."] },
      B: { vraag: "Watter een van die volgende is 'n voorbeeld van 'n raamstruktuur MET 'n vel?", antwoord: "'n Tent", afleiers: ["'n Spinnerak", "'n Huis se baksteenmuur", "'n Eier"] },
      C: { vraag: "'n Spinnerak is 'n voorbeeld van watter raamstruktuur?", antwoord: "Oop raamstruktuur (sonder 'n vel)", afleiers: ["Soliede struktuur", "Dop-struktuur", "Massa-struktuur"] }
    }},
    { konsep: "Soliede strukture", variante: {
      A: { vraag: "Wat is 'n SOLIEDE struktuur?", antwoord: "Die opstapeling van stukke materiaal — bv. 'n huis se baksteenmuur.", afleiers: ["'n Struktuur wat deur 'n raam ondersteun word.", "'n Struktuur wat hol binne is.", "'n Struktuur wat deur 'n vel bedek word."] },
      B: { vraag: "Soliede strukture word soms ook genoem...", antwoord: "Massa-strukture", afleiers: ["Dop-strukture", "Raamstrukture", "Ligstrukture"] },
      C: { vraag: "Watter een is 'n voorbeeld van 'n soliede struktuur?", antwoord: "'n Baksteenmuur", afleiers: ["'n Tent", "'n Eier-dop", "'n Spinnerak"] }
    }},
    { konsep: "Triangulering / sterk vorms", variante: {
      A: { vraag: "Watter VORM is die sterkste in 'n struktuur?", antwoord: "'n Driehoek", afleiers: ["'n Vierkant", "'n Sirkel", "'n Reghoek"] },
      B: { vraag: "Hoekom is 'n driehoek so 'n sterk vorm?", antwoord: "Druk word eweredig tussen sy drie sye versprei.", afleiers: ["Dit het meer hoeke as enige ander vorm.", "Dit kan in enige rigting gedraai word.", "Dit is altyd kleiner as ander vorms."] },
      C: { vraag: "Wat is TRIANGULERING?", antwoord: "Verdigtighek — driehoeke byvoeg om 'n struktuur sterker te maak.", afleiers: ["Drie strukture saam bou.", "Drie kleure gebruik in die ontwerp.", "'n Struktuur in drie dele verdeel."] }
    }},
    { konsep: "Stabiliteit van 'n struktuur", variante: {
      A: { vraag: "Wat maak 'n struktuur STABIEL?", antwoord: "'n Lae swaartepunt en 'n groot basis.", afleiers: ["'n Hoë swaartepunt en 'n klein basis.", "Dat dit van hout gemaak is.", "Dat dit baie kleur het."] },
      B: { vraag: "Hoekom is 'n groot BASIS belangrik vir stabiliteit?", antwoord: "As 'n struktuur 'n groot basis het, is dit moeiliker om om te val.", afleiers: ["Dit maak die struktuur ligter.", "Dit maak die struktuur duurder.", "Dit het geen invloed nie."] },
      C: { vraag: "Watter een van die volgende kan stabiliteit BEDREIG?", antwoord: "Voorkoms van krake of geringe verskuiwings in 'n struktuur.", afleiers: ["'n Groot basis.", "'n Lae swaartepunt.", "Triangulering."] }
    }},
    { konsep: "Klasse van hefbome", variante: {
      A: { vraag: "Watter is NIE 'n klas van hefbome nie?", antwoord: "Klas 4", afleiers: ["Klas 1", "Klas 2", "Klas 3"] },
      B: { vraag: "By 'n KLAS 1-hefboom is die steunpunt...", antwoord: "Tussen die mag en die las", afleiers: ["By die punt waar die mag toegepas word", "By die punt waar die las is", "Buite die hefboom"] },
      C: { vraag: "By 'n KLAS 2-hefboom is die LAS...", antwoord: "Tussen die steunpunt en die mag", afleiers: ["By die steunpunt self", "Buite die hefboom", "Tussen die mag en die steunpunt"] }
    }},
    { konsep: "Meganiese voordeel", variante: {
      A: { vraag: "Wat beteken 'n POSITIEWE meganiese voordeel (MV > 1)?", antwoord: "Minder mag word benodig om die las te skuif (magafstand > lasafstand).", afleiers: ["Meer mag word benodig as die las.", "Die mag en die las is gelyk.", "Die hefboom werk glad nie nie."] },
      B: { vraag: "Wanneer MV = 1, beteken dit...", antwoord: "Geen meganiese voordeel nie — die mag is gelyk aan die las (magafstand = lasafstand).", afleiers: ["Maksimum voordeel.", "Negatiewe voordeel.", "Die hefboom is gebreek."] },
      C: { vraag: "By 'n KLAS 3-hefboom (mag tussen las en steunpunt) is die meganiese voordeel altyd...", antwoord: "Negatief (MV < 1) — meer mag word benodig as die las.", afleiers: ["Positief (MV > 1) — minder mag benodig.", "MV = 1 — gelyk.", "Onbepaalbaar — wissel met elke gebruik."] }
    }},
    { konsep: "Gekoppelde hefbome", variante: {
      A: { vraag: "Wat is 'n GEKOPPELDE hefboom?", antwoord: "Twee hefbome wat by die steunpunt verbind is.", afleiers: ["Een hefboom wat aan 'n muur vasgemaak is.", "'n Hefboom sonder 'n steunpunt.", "Drie hefbome wat aanmekaar geheg is."] },
      B: { vraag: "Watter een is 'n voorbeeld van 'n KLAS 1 gekoppelde hefboom?", antwoord: "'n Skêr of tang", afleiers: ["'n Kruiwa", "'n Haartangetjie", "'n Hamer"] },
      C: { vraag: "'n Kruiwa is 'n voorbeeld van watter klas hefboom?", antwoord: "Klas 2 (las tussen steunpunt en mag)", afleiers: ["Klas 1", "Klas 3", "Geen klas nie — dit is nie 'n hefboom nie"] }
    }},
    { konsep: "Hidrouliese vs Pneumatiese stelsels", variante: {
      A: { vraag: "Wat is die hoofverskil tussen HIDROULIESE en PNEUMATIESE stelsels?", antwoord: "Hidroulies gebruik vloeistof (nie saamparbaar); pneumaties gebruik saamgeperste lug.", afleiers: ["Hidroulies gebruik elektrisiteit; pneumaties gebruik gas.", "Hidroulies werk warm; pneumaties werk koud.", "Hidroulies is altyd swaarder as pneumaties."] },
      B: { vraag: "Hoekom word water gewoonlik NIE in hidrouliese stelsels gebruik nie?", antwoord: "Water het nie goeie smeringseienskappe nie — olie word eerder gebruik.", afleiers: ["Water is te duur.", "Water kook te vinnig in die silinders.", "Water is te lig om die hefboom te beweeg."] },
      C: { vraag: "By hidrouliese koppelings — die GROOTSTE meganiese voordeel word bereik wanneer...", antwoord: "Die insetspuit (waar jy druk) kleiner is as die uitsetspuit (waar die las gelig word).", afleiers: ["Die insetspuit groter is as die uitsetspuit.", "Albei spuite presies dieselfde grootte is.", "Beide spuite vol lug is in plaas van vloeistof."] }
    }}
  ]
};

// ===== HOOFFUNKSIE =====
function bouAlles() {
  const sheet = skepMasterSheet();
  const urls = { masterSheet: sheet.getUrl(), forms: {} };
  const formMap = {};

  VAKKE.forEach(vak => {
    urls.forms[vak.kode] = {};
    POGINGS.forEach(poging => {
      const form = skepVormVirVak(vak, poging);
      koppelAanSheet(form, sheet);
      formMap[form.getId()] = { vak: vak.kode, poging: poging.nommer };
      urls.forms[vak.kode][poging.nommer] = form.getPublishedUrl();
    });
  });

  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_FORM_MAP, JSON.stringify(formMap));
  props.setProperty(PROP_MASTER_SHEET_ID, sheet.getId());
  // EEN sneller dek alle 33 vorms (quota = 20, dus per-vorm-snellers werk nie).
  installeerSpreadsheetTrigger(sheet);

  Logger.log('======================================================');
  Logger.log('KLAAR! Slaagpunt is %s%% op elke toets; maks %s pogings.', SLAAGPUNT, POGINGS.length);
  Logger.log('Master sheet: %s', urls.masterSheet);
  Logger.log('  --> Open dit, gaan na File → Share → Publish to web → Sheet1 → CSV → Publish.');
  Logger.log('  --> Plak die CSV URL as MASTER_CSV_URL in index.html.');
  Logger.log('======================================================');
  Object.keys(urls.forms).forEach(vakKode => {
    Object.keys(urls.forms[vakKode]).forEach(pogingNr => {
      Logger.log('%s · Toets %s: %s', vakKode, pogingNr, urls.forms[vakKode][pogingNr]);
    });
  });
  Logger.log('======================================================');

  return urls;
}

function skepMasterSheet() {
  const sheet = SpreadsheetApp.create(SHEET_NAAM);
  const blad = sheet.getActiveSheet();
  blad.setName(TELLINGS_BLAD);
  blad.appendRow(TELLINGS_KOP);
  blad.getRange('A1:E1').setFontWeight('bold');
  return sheet;
}

// Maak seker die Tellings-blad bestaan en het 'n kop. Word ook deur die snellerstroom geroep.
function verseterTellingsBlad(spreadsheet) {
  let blad = spreadsheet.getSheetByName(TELLINGS_BLAD);
  if (!blad) {
    blad = spreadsheet.insertSheet(TELLINGS_BLAD, 0);
  }
  if (blad.getLastRow() === 0) {
    blad.appendRow(TELLINGS_KOP);
    blad.getRange('A1:E1').setFontWeight('bold');
  }
  return blad;
}

function skepVormVirVak(vak, poging) {
  const titel = `${vak.etiket} — ${poging.etiket} (slaagpunt: ${SLAAGPUNT}%)`;
  const form = FormApp.create(titel);
  form.setTitle(titel);
  form.setIsQuiz(true);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShuffleQuestions(true);
  form.setProgressBar(true);
  form.setDescription(
    `Hierdie is jou ${poging.etiket} vir ${vak.etiket}.\n` +
    `Jy moet ${SLAAGPUNT}% kry om te slaag. Sterkte, Ian!`
  );

  // Versteekte velde wat in die sheet moet beland (Vak + Poging-nommer)
  form.addTextItem()
    .setTitle('Vak (moenie verander nie)')
    .setHelpText(`Tik in: ${vak.kode}`);
  form.addTextItem()
    .setTitle('Poging-nommer (moenie verander nie)')
    .setHelpText(`Tik in: ${poging.nommer}`);

  // Vrae — alle konsepte vir hierdie vak, met die regte variant per poel
  const kaarte = QUIZ_DATA[vak.kode] || [];
  if (vak.stub || kaarte.length === 0) {
    const stub = form.addParagraphTextItem();
    stub.setTitle('Hierdie toets is nog nie gebou nie.');
    stub.setHelpText(
      `Daar is nog nie flitskaart-data vir ${vak.etiket} nie. ` +
      `Voeg flitskaarte by index.html, of voeg vrae handmatig hier by in Google Forms.`
    );
  } else {
    kaarte.forEach(kaart => {
      const v = kaart.variante[poging.poel];
      if (!v) return;
      const item = form.addMultipleChoiceItem();
      const opsies = skommel([v.antwoord, ...v.afleiers]);
      item.setTitle(v.vraag);
      item.setRequired(true);
      item.setPoints(1);
      item.setChoices(opsies.map(o =>
        item.createChoice(o, o === v.antwoord)
      ));
      item.setFeedbackForCorrect(FormApp.createFeedback().setText('✅ Reg!').build());
      item.setFeedbackForIncorrect(FormApp.createFeedback().setText('❌ Verkeerd — gaan kyk weer na die flitskaart vir hierdie konsep.').build());
    });
  }

  return form;
}

function koppelAanSheet(form, sheet) {
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
}

// ===== KONSOLIDASIE: vorm-submissies → Tellings-blad =====
// Wanneer 'n Google Form aan 'n spreadsheet gekoppel word, skep dit 'n nuwe
// 'Form Responses N'-tab — NIE in die Tellings-blad nie. Daarom het Ian se
// toetsuitslae nooit op die webwerf opgedaag nie. Hierdie snellers vat elke
// submissie en plaas dit met die korrekte vak + poging in Tellings.

// Google Apps Script beperk 'n script tot 20 installable triggers per gebruiker, en ons
// het 33 vorms — een sneller per vorm slaan dus die quota dood. In plaas daarvan
// installeer ons EEN sneller op die master spreadsheet wat vir elke form-submissie
// vuur (ongeag van watter form), en identifiseer die form via die tab se gekoppelde
// form-URL.
function installeerSpreadsheetTrigger(spreadsheet) {
  // Verwyder ALLE bestaande onFormSubmitNaTellings-snellers (insluitend per-vorm
  // snellers van vorige weergawes) om die quota vry te maak en duplikate te vermy.
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'onFormSubmitNaTellings') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('onFormSubmitNaTellings')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}

function onFormSubmitNaTellings(e) {
  const props = PropertiesService.getScriptProperties();
  const masterSheetId = props.getProperty(PROP_MASTER_SHEET_ID);
  if (!masterSheetId) {
    console.error('Master sheet ID nie gestoor nie — hardloop konsolideerInstellings() eers.');
    return;
  }
  const map = JSON.parse(props.getProperty(PROP_FORM_MAP) || '{}');

  // Spreadsheet-vlak onFormSubmit gee jou nie e.source as 'n Form nie. Identifiseer
  // die form deur na die tab te kyk waar die ry geland het — daardie tab is deur
  // Google Forms outomaties gekoppel aan die form.
  const responseBlad = e.range.getSheet();
  let formId = null;
  try {
    const formUrl = responseBlad.getFormUrl();
    if (formUrl) {
      const m = formUrl.match(/\/forms\/d\/([^\/]+)/);
      if (m) formId = m[1];
    }
  } catch (err) { /* tab het nie 'n form-URL gekoppel nie */ }
  const meta = formId ? map[formId] : null;
  if (!meta) {
    console.warn('Geen vak/poging-mapping vir submissie op tab "' + responseBlad.getName() + '" (form ' + formId + ').');
    return;
  }

  // Open die form om die score en totaal te bereken.
  const form = FormApp.openById(formId);
  const totaal = berekenFormTotaal(form);
  // Vat die mees onlangse response (Ian is 'n enkel gebruiker, geen race).
  const responses = form.getResponses();
  const response = responses[responses.length - 1];
  const tydstempel = response ? response.getTimestamp() : (e.values && e.values[0] ? new Date(e.values[0]) : new Date());
  const score = response ? kryScoreVeilig(response) : null;

  const tellings = verseterTellingsBlad(SpreadsheetApp.openById(masterSheetId));
  tellings.appendRow([
    tydstempel,
    meta.vak,
    meta.poging,
    score,
    totaal
  ]);
}

// ===== EENMALIGE MIGRASIE VIR BESTAANDE VORMS =====
// Run hierdie EEN keer in die Apps Script-redakteur as die 33 vorms reeds bestaan
// (m.a.w. bouAlles is reeds vroeër gehardloop sonder die sneller).
// Dit vind die master sheet, koppel die sneller aan elke vorm met die regte
// titel-patroon ("{vak.etiket} — Toets N (slaagpunt: 80%)"), en stoor die
// formId→{vak,poging}-map sodat onFormSubmitNaTellings weet waar elke rij
// moet land. Veilig om weer te hardloop.
function konsolideerInstellings() {
  // Bou 'n vinnige opsoek-tabel van form-titel na {vak, poging}.
  const titelNaMeta = {};
  VAKKE.forEach(function(vak) {
    POGINGS.forEach(function(poging) {
      const titel = vak.etiket + ' — ' + poging.etiket + ' (slaagpunt: ' + SLAAGPUNT + '%)';
      titelNaMeta[titel] = { vak: vak.kode, poging: poging.nommer };
    });
  });

  // Vind die master spreadsheet (sou deur bouAlles geskep gewees het).
  const sheetMatches = DriveApp.getFilesByName(SHEET_NAAM);
  if (!sheetMatches.hasNext()) {
    throw new Error("Master sheet '" + SHEET_NAAM + "' nie gevind nie. Hardloop bouAlles() eers.");
  }
  const masterSheetFile = sheetMatches.next();
  const masterSheetId = masterSheetFile.getId();
  const masterSpreadsheet = SpreadsheetApp.openById(masterSheetId);
  verseterTellingsBlad(masterSpreadsheet);

  // Loop deur alle Google Forms in jou Drive en vat dié wat by die titel-patroon pas.
  const formIdToMeta = {};
  let gevind = 0;
  const files = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
  while (files.hasNext()) {
    const file = files.next();
    const meta = titelNaMeta[file.getName()];
    if (!meta) continue;
    const form = FormApp.openById(file.getId());
    // Maak seker die vorm skryf na ons master sheet (nie 'n ander destination nie).
    try {
      if (form.getDestinationId() !== masterSheetId) {
        form.setDestination(FormApp.DestinationType.SPREADSHEET, masterSheetId);
      }
    } catch (err) {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, masterSheetId);
    }
    formIdToMeta[form.getId()] = meta;
    gevind++;
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_FORM_MAP, JSON.stringify(formIdToMeta));
  props.setProperty(PROP_MASTER_SHEET_ID, masterSheetId);
  // EEN sneller op die spreadsheet dek alle vorms — vermy die 20-snellers-per-script-quota.
  installeerSpreadsheetTrigger(masterSpreadsheet);

  Logger.log('Konsolidasie klaar: %s vorms gemap, 1 spreadsheet-sneller geinstalleer. Master sheet: %s',
    gevind, masterSheetFile.getUrl());
  return { gemap: gevind, masterSheetId: masterSheetId };
}

// ===== EENMALIGE BACK-FILL VAN OU SUBMISSIES =====
// Loop oor elke geregistreerde vorm se historiese responses (wat in die ou
// 'Form Responses N'-tabbe vassit) en skryf dit in Tellings met die korrekte
// vak + poging. Dedupliseer op (vak, poging, timestamp) sodat dit veilig is
// om weer te hardloop — bv. as jy nuwe submissies sedert konsolidasie het.
function migreerOuSubmissies() {
  const props = PropertiesService.getScriptProperties();
  const masterSheetId = props.getProperty(PROP_MASTER_SHEET_ID);
  if (!masterSheetId) {
    throw new Error('Geen master sheet ID gestoor nie. Hardloop konsolideerInstellings() eers.');
  }
  const map = JSON.parse(props.getProperty(PROP_FORM_MAP) || '{}');
  const formIds = Object.keys(map);
  if (formIds.length === 0) {
    throw new Error('Geen vorms in die map. Hardloop konsolideerInstellings() eers.');
  }

  const tellings = verseterTellingsBlad(SpreadsheetApp.openById(masterSheetId));

  // Bou 'n stel bestaande sleutels (vak|poging|tydstempel) om duplikate te vermy.
  const bestaande = {};
  const data = tellings.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const ry = data[r];
    if (!ry[0]) continue;
    const ts = ry[0] instanceof Date ? ry[0].toISOString() : String(ry[0]);
    bestaande[ry[1] + '|' + ry[2] + '|' + ts] = true;
  }

  let bygevoeg = 0, dedup = 0, nieKwis = 0, mislukte = 0;
  formIds.forEach(function(formId) {
    const meta = map[formId];
    let form;
    try {
      form = FormApp.openById(formId);
    } catch (err) {
      Logger.log('Kon nie form %s open nie: %s', formId, err);
      mislukte++;
      return;
    }
    // Stub-vorms is nie kwis-modus nie en het geen graded items nie — slaan oor.
    let isKwis = false;
    try { isKwis = form.isQuiz(); } catch (err) { /* ignoreer */ }
    if (!isKwis) {
      Logger.log('Slaan vorm "%s" oor — nie kwis-modus nie (%s · %s).',
        form.getTitle(), meta.vak, meta.poging);
      nieKwis++;
      return;
    }
    const totaal = berekenFormTotaal(form);
    form.getResponses().forEach(function(response) {
      const score = kryScoreVeilig(response);
      if (score === null) return;
      const ts = response.getTimestamp();
      const sleutel = meta.vak + '|' + meta.poging + '|' + ts.toISOString();
      if (bestaande[sleutel]) { dedup++; return; }
      tellings.appendRow([ts, meta.vak, meta.poging, score, totaal]);
      bestaande[sleutel] = true;
      bygevoeg++;
    });
  });

  Logger.log('Back-fill klaar: %s rye bygevoeg, %s dedup, %s vorms oorgeslaan (nie-kwis), %s vorms misluk.',
    bygevoeg, dedup, nieKwis, mislukte);
  return { bygevoeg: bygevoeg, dedup: dedup, nieKwis: nieKwis, mislukte: mislukte };
}

// Bereken die totale moontlike punte op 'n vorm deur alle graded items op te tel.
function berekenFormTotaal(form) {
  let totaal = 0;
  form.getItems().forEach(function(item) {
    try {
      switch (item.getType()) {
        case FormApp.ItemType.MULTIPLE_CHOICE:
          totaal += item.asMultipleChoiceItem().getPoints(); break;
        case FormApp.ItemType.CHECKBOX:
          totaal += item.asCheckboxItem().getPoints(); break;
        case FormApp.ItemType.LIST:
          totaal += item.asListItem().getPoints(); break;
      }
    } catch (err) { /* item is nie graded nie — slaan oor */ }
  });
  return totaal;
}

// FormResponse.getScore() bestaan slegs op kwis-vorms. Op gewone vorms
// is dit nie 'n funksie nie en gooi 'TypeError'. Gee veilig null terug.
function kryScoreVeilig(response) {
  try {
    if (typeof response.getScore !== 'function') return null;
    const score = response.getScore();
    return (typeof score === 'number' && !isNaN(score)) ? score : null;
  } catch (err) {
    return null;
  }
}

function skommel(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== OPRUIM =====
// Run hierdie EERS as jy van skoon af wil begin. Vee alle ou vorms + die sheet uit.
function veeAllesUit_GEVAAR() {
  const sheets = DriveApp.getFilesByName(SHEET_NAAM);
  while (sheets.hasNext()) {
    sheets.next().setTrashed(true);
  }
  // Vee oue (escalating-ladder) vorms uit
  const ouePogings = [
    { etiket: 'Toets 1', doel: 20 },
    { etiket: 'Toets 2', doel: 50 },
    { etiket: 'Toets 3', doel: 80 }
  ];
  VAKKE.forEach(vak => {
    // Vee oue formaat-vorms uit ("X — Toets N (doel: NN%)")
    ouePogings.forEach(p => {
      const naam = `${vak.etiket} — ${p.etiket} (doel: ${p.doel}%)`;
      const files = DriveApp.getFilesByName(naam);
      while (files.hasNext()) files.next().setTrashed(true);
    });
    // Vee nuwe formaat-vorms uit ("X — Toets N (slaagpunt: 80%)")
    POGINGS.forEach(p => {
      const naam = `${vak.etiket} — ${p.etiket} (slaagpunt: ${SLAAGPUNT}%)`;
      const files = DriveApp.getFilesByName(naam);
      while (files.hasNext()) files.next().setTrashed(true);
    });
  });
  Logger.log('Alle ou vorms + sheet na asblik gestuur. Gaan drive.google.com → Trash → Empty trash om dit permanent te verwyder.');
}
