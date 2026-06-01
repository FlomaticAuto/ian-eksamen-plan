/**
 * Ian Eksamen-Plan — Google Forms + Sheet bootstrapper (variant-weergawe).
 *
 * Reël: Slaagpunt = 80% op ELKE toets. Maks 3 pogings; daarna "kry hulp".
 * Toets 1, 2, 3 toets DIESELFDE konsepte met ander bewoording (variante A/B/C).
 *
 * ── VINNIG BEGIN ──────────────────────────────────────────────────────────────
 * Om net die Geskiedenisvorms te skep / herbou (ander vakke onaangeraak):
 *   1. Gaan na https://script.google.com → open die bestaande projek
 *   2. VERVANG Code.gs met hierdie lêer
 *   3. Hardloop `herboueGeskiedenisVorms()` — dit bou 3 volledige kwis-vorms
 *   4. View → Logs vir die 3 nuwe URLs — plak hulle in FORM_URLS.geskiedenis
 *      in index.html
 *
 * ── WHATSAPP-KENNISGEWINGS (via Make.com scenario "Claude Send WhatsApp") ─────
 *   1. Vul WA_ONTVANGER in met jou WhatsApp-nommer (landkode sonder +, bv. 27821234567)
 *   2. Stel WA_AKTIEF = true
 *   3. Hardloop `toetsWhatsApp()` om te bevestig dit werk
 *   — Die boodskap word via die bestaande Make.com webhook gestuur
 *   — Geen ekstra opstelling nodig — die scenario is reeds aktief
 *
 * ── VOLLEDIGE HERBOU (alle vakke) ────────────────────────────────────────────
 *   - Hardloop `veeAllesUit_GEVAAR` → dan `bouAlles`
 *   - View → Logs vir alle URLs; plak in FORM_URLS in index.html
 *   - Publiseer die sheet via File → Share → Publish to web → CSV
 *
 * ── BESTAANDE VORMS SONDER SNELLER ───────────────────────────────────────────
 *   - Hardloop `konsolideerInstellings()` — koppel sneller aan bestaande vorms
 *   - Hardloop `migreerOuSubmissies()` — kopieer ou antwoorde na Tellings-blad
 */

const SHEET_NAAM = 'Ian — Eksamen Tellings';
const TELLINGS_BLAD = 'Tellings';
const TELLINGS_KOP = ['Timestamp', 'Vak', 'Poging', 'Telling', 'UitOf'];

// ===== WHATSAPP CONFIG (via Make.com — scenario "Claude Send WhatsApp") ======
// Webhook: https://hook.eu2.make.com/og4xli5ljkagkuas1om2oragzy2xxpm2
// Payload: { "to": "27XXXXXXXXX", "message": "...", "image_url": "" }
// Enigste wat jy moet doen: vul WA_ONTVANGER in en stel WA_AKTIEF = true
const MAKE_WA_WEBHOOK = 'https://hook.eu2.make.com/og4xli5ljkagkuas1om2oragzy2xxpm2';
const WA_ONTVANGER    = '27748660437';
const WA_AKTIEF       = true;           // ← nommer ingevul, WhatsApp aktief
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
  { kode: 'geskiedenis', etiket: 'Geskiedenis',             stub: false },
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
  geskiedenis: [
    { konsep: "Kamele as vervoermiddel oor die Sahara", variante: {
      A: { vraag: "Waarom was kamele die beste vervoermiddel oor die Saharawoestyn?", antwoord: "Hulle loop maklik oor sand, kan lank sonder kos en water gaan, en kan baie handelware dra.", afleiers: ["Hulle is die vinnigste diere ter wêreld.", "Hulle het glad nie water nodig nie en kan vlieg.", "Hulle is goedkoop en kom meestal in Europa voor."] },
      B: { vraag: "Hoeveel kamele was soms in een enkele karavaan oor die Sahara?", antwoord: "Tot 40 000 kamele.", afleiers: ["Tot 400 kamele.", "Tot 4 000 kamele.", "Tot 400 000 kamele."] },
      C: { vraag: "Wat is 'n karavaan?", antwoord: "'n Groep mense wat hul handelsware in lang rye saam oor ver afstande vervoer.", afleiers: ["'n Enkele kameel wat alleen goedere dra.", "'n Skip wat goedere oor die see vervoer.", "'n Mark waar net sout verkoop word."] }
    }},
    { konsep: "Die Saharawoestyn", variante: {
      A: { vraag: "Wat is die Saharawoestyn?", antwoord: "Die grootste woestyn ter wêreld — groter as die VSA.", afleiers: ["'n Klein woestyn in die suide van Afrika.", "Die tweede grootste woestyn, kleiner as die Arabiese Woestyn.", "'n Groot grasvlakte met baie riviere."] },
      B: { vraag: "Hoekom was dit so moeilik om die Saharawoestyn te oorsteek?", antwoord: "Dit is baie sanderig en warm, met baie gevaarlike sandstorms.", afleiers: ["Dit is die koudste plek op aarde.", "Daar is te veel riviere en mere in die pad.", "Dit reën byna elke dag in die woestyn."] },
      C: { vraag: "Hoe groot is die Saharawoestyn vergeleke met ander gebiede?", antwoord: "Dit is groter as die Verenigde State van Amerika.", afleiers: ["Dit is kleiner as Suid-Afrika.", "Dit is presies dieselfde grootte as Europa se kleinste land.", "Dit is so groot soos een Suid-Afrikaanse provinsie."] }
    }},
    { konsep: "Handelsware oor die Saharawoestyn", variante: {
      A: { vraag: "Watter handelsware het van Noord-Afrika NA Mali gekom?", antwoord: "Sout, koper en stof (tekstiele).", afleiers: ["Goud, slawe en ivoor.", "Tee, rys en porselein.", "Olie, steenkool en diamante."] },
      B: { vraag: "Watter handelsware het Mali UITGEVOER na Noord-Afrika?", antwoord: "Goud, slawe en ivoor.", afleiers: ["Sout, koper en stof.", "Wapens en gereedskap.", "Wyn en olyfolie."] },
      C: { vraag: "Hoekom was sout so 'n waardevolle handelsartikel?", antwoord: "Dit was nodig om kos te preserveer (te bewaar).", afleiers: ["Dit was die enigste vorm van geld in Europa.", "Dit is gebruik om huise mee te bou.", "Dit was nodig om kamele mee te voer."] }
    }},
    { konsep: "Die verspreiding van Islam na Wes-Afrika", variante: {
      A: { vraag: "Hoe het Islam na Wes-Afrika versprei?", antwoord: "Deur Arabiese handelaars wat oor die Saharawoestyn gereis en die godsdiens saamgebring het.", afleiers: ["Deur Europese sendelinge wat kerke gebou het.", "Deur die Portugese seevaarders aan die weskus.", "Deur 'n militêre verowering deur die Arabiese leër."] },
      B: { vraag: "In watter eeu het Islam vir die eerste keer in Wes-Afrika verskyn?", antwoord: "In die 9de eeu.", afleiers: ["In die 15de eeu.", "In die 1ste eeu.", "In die 19de eeu."] },
      C: { vraag: "Watter mense in Wes-Afrika het Islam die eerste aangeneem?", antwoord: "Mense in die stede, veral handelaars en amptenare.", afleiers: ["Net die boere op die platteland.", "Net die slawe op die plantasies.", "Net die Europese besoekers."] }
    }},
    { konsep: "Kaurieskulpe as geld", variante: {
      A: { vraag: "Wat is kaurieskulpe?", antwoord: "Porseleinkulpe van die verre Indiese Oseaan wat as 'n tipe geld gebruik is.", afleiers: ["Goue munte wat in Mali geslaan is.", "Klein klippies wat in die Sahara gevind is.", "Stukke sout wat in vierkante gesny is."] },
      B: { vraag: "Hoe het kaurieskulpe by Timboektoe uitgekom?", antwoord: "Dit is eers na Egipte gebring en daarna langs die handelsroetes deur die Sahara geneem.", afleiers: ["Dit is direk van Europa per skip aangery.", "Dit is in die riviere naby Timboektoe gevind.", "Dit is deur die Portugese aan die weskus afgelaai."] },
      C: { vraag: "Behalwe kaurieskulpe, hoe is handel ook gedryf?", antwoord: "Deur ruilhandel (barter) — goedere is vir ander goedere geruil.", afleiers: ["Net met goue en silwer munte.", "Net met papiergeld.", "Net met bankkaarte."] }
    }},
    { konsep: "Die drie koninkryke van Wes-Afrika", variante: {
      A: { vraag: "Watter drie koninkryke het mekaar in Wes-Afrika opgevolg, in die regte volgorde?", antwoord: "Ghana, dan Mali, dan Songhai.", afleiers: ["Songhai, dan Ghana, dan Mali.", "Mali, dan Songhai, dan Ghana.", "Egipte, dan Ghana, dan Rome."] },
      B: { vraag: "Wanneer het die koninkryk van Mali ontstaan en wie het dit gestig?", antwoord: "In 1230, toe Sundiata al die stamme saamgesnoer het.", afleiers: ["In die jaar 700, deur Mansa Musa.", "In 1490, deur Ibn Battuta.", "In 1550, deur Leo Africanus."] },
      C: { vraag: "Waarmee het hierdie koninkryke ryk en magtig geword?", antwoord: "Deur die handel in sout en goud.", afleiers: ["Deur die handel in olie en steenkool.", "Deur visvang in die Atlantiese Oseaan.", "Deur die ontdekking van silwer-myne in Europa."] }
    }},
    { konsep: "Mansa Musa en hoe hy Mali bestuur het", variante: {
      A: { vraag: "Wie was Mansa Musa?", antwoord: "Die mees bekende heerser van Mali, wat ongeveer 25 jaar in die 14de eeu regeer het.", afleiers: ["Die argitek wat die moskees van Mali gebou het.", "'n Moslem-reisiger wat oor Mali geskryf het.", "Die stigter van die koninkryk Ghana."] },
      B: { vraag: "Hoe het Mansa Musa die groot koninkryk Mali bestuur?", antwoord: "Met die hulp van Moslem-geleerdes, 'n raad van die weermag en koninklike families, en senior slawe as lojale raadgewers.", afleiers: ["Hy het alles alleen sonder enige raadgewers bestuur.", "Hy het Europese amptenare ingevoer om te regeer.", "Hy het die land in klein republieke verdeel sonder 'n koning."] },
      C: { vraag: "In watter eeu het Mansa Musa oor Mali geregeer?", antwoord: "In die 14de eeu.", afleiers: ["In die 9de eeu.", "In die 19de eeu.", "In die 21ste eeu."] }
    }},
    { konsep: "Mansa Musa se pelgrimsreis na Mekka", variante: {
      A: { vraag: "Wanneer het Mansa Musa op sy pelgrimsreis na Mekka vertrek?", antwoord: "In 1324.", afleiers: ["In 1230.", "In 1550.", "In 1789."] },
      B: { vraag: "Wat was die gevolg van al die goud wat Mansa Musa in Egipte uitgedeel het?", antwoord: "Die prys van goud het vir jare daarna gedaal.", afleiers: ["Die prys van goud het skerp gestyg.", "Egipte het bankrot geraak.", "Goud is daarna nooit weer in Egipte gebruik nie."] },
      C: { vraag: "Ongeveer hoeveel mense het Mansa Musa op sy pelgrimsreis saamgeneem?", antwoord: "Ongeveer 60 000 mense, saam met meer as 80 kamele en goud.", afleiers: ["Ongeveer 600 mense.", "Net sy onmiddellike familie.", "Ongeveer 6 mense."] }
    }},
    { konsep: "Al-Sahili die argitek", variante: {
      A: { vraag: "Wie was Al-Sahili?", antwoord: "'n Beroemde argitek wat Mansa Musa tydens sy pelgrimsreis na Mekka ontmoet het.", afleiers: ["'n Moslem-reisiger wat 'n boek oor Afrika geskryf het.", "'n Slaaf wat 'n opstand in Amerika gelei het.", "Die koning wat ná Mansa Musa regeer het."] },
      B: { vraag: "Wat het Al-Sahili in Mali gedoen?", antwoord: "Hy het pragtige moskees in die tradisionele Wes-Afrikaanse styl gebou.", afleiers: ["Hy het die eerste universiteit in Europa gestig.", "Hy het die katoenpluismeul uitgevind.", "Hy het die Ondergrondse Spoorweg gestig."] },
      C: { vraag: "Hoe het Al-Sahili in Mali beland?", antwoord: "Hy het saam met Mansa Musa van die pelgrimsreis af na Mali teruggekeer.", afleiers: ["Hy is as 'n slaaf na Mali gebring.", "Hy is in Mali gebore en het nooit weggegaan nie.", "Hy is deur die Portugese na Mali gestuur."] }
    }},
    { konsep: "Die Jali (Griot)", variante: {
      A: { vraag: "Wat is 'n Jali (Griot)?", antwoord: "'n Gemeenskaplike verteller wat die mondelinge geskiedenis van families en stamgroepe bewaar en oordra.", afleiers: ["'n Soldaat wat die koning se paleis bewaak.", "'n Handelaar wat sout oor die Sahara vervoer.", "'n Boer wat die koning se grond bewerk."] },
      B: { vraag: "Watter musiekinstrument speel die Jali?", antwoord: "Die Afrika-harp, genoem die kora.", afleiers: ["Die tromboon.", "Die kitaar.", "Die klavier."] },
      C: { vraag: "Hoekom was die Jali so belangrik vir die gemeenskap?", antwoord: "Hy was die gemeenskap se 'lewende biblioteek' wat stories van geslag na geslag oorgedra het.", afleiers: ["Hy het al die belasting vir die koning ingevorder.", "Hy het die enigste geskrewe boeke in die dorp besit.", "Hy het die kamele vir die karavane versorg."] }
    }},
    { konsep: "Die Groot Moskee van Djenné", variante: {
      A: { vraag: "Wat maak die Groot Moskee van Djenné so besonders?", antwoord: "Dit is die grootste modder-gebou ter wêreld en is 'n Wêrelderfenisgebied.", afleiers: ["Dit is heeltemal uit goud gebou.", "Dit is die oudste klipgebou in Europa.", "Dit is heeltemal onder die grond gebou."] },
      B: { vraag: "Ongeveer hoeveel mense kan die Groot Moskee van Djenné inneem?", antwoord: "Ongeveer 3 000 mense.", afleiers: ["Ongeveer 30 mense.", "Ongeveer 300 000 mense.", "Net die koning en sy familie."] },
      C: { vraag: "Hoekom moet die Groot Moskee van Djenné elke jaar herstel word?", antwoord: "Reën en sand beskadig die moddermure.", afleiers: ["Besoekers breek elke jaar stukke af.", "Dit word elke jaar afgebreek en weer hoër gebou.", "Aardbewings beskadig dit elke jaar."] }
    }},
    { konsep: "Abubakar II en sy seereis", variante: {
      A: { vraag: "Hoeveel skepe het Abubakar II gebruik om die Atlantiese Oseaan te probeer verken?", antwoord: "2 000 skepe.", afleiers: ["20 skepe.", "200 000 skepe.", "Net 2 skepe."] },
      B: { vraag: "Wat het met Abubakar II gebeur nadat hy die Atlantiese Oseaan ingevaar het?", antwoord: "Hy het nooit teruggekeer nie.", afleiers: ["Hy het Amerika ontdek en ryk teruggekom.", "Hy het na 'n jaar veilig teruggekeer.", "Hy het na Europa gevaar en 'n koning daar geword."] },
      C: { vraag: "Wat was die gevolg daarvan dat Abubakar II nooit teruggekeer het nie?", antwoord: "Mansa Musa het die koningskap geërf en die bekendste heerser van Mali geword.", afleiers: ["Die koninkryk Mali het dadelik tot 'n einde gekom.", "Die Portugese het Mali oorgeneem.", "Songhai het onmiddellik Mali se plek ingeneem."] }
    }},
    { konsep: "Timboektoe as handelsentrum", variante: {
      A: { vraag: "Hoekom was Timboektoe 'n belangrike handelsentrum?", antwoord: "Dit het op die trans-Sahara-karavaanroete gelê en Noord-Afrika, Asië en Europa met Wes-Afrika verbind.", afleiers: ["Dit was 'n hawe aan die Atlantiese Oseaan.", "Dit was die enigste dorp met 'n spoorlyn.", "Dit het langs 'n groot goudmyn in Europa gelê."] },
      B: { vraag: "Watter goedere is van Wes-Afrika af in Timboektoe verkoop?", antwoord: "Ivoor, volstruisvere, slawe en graan.", afleiers: ["Olie, steenkool en staal.", "Motors en masjiene.", "Tee en porselein uit China."] },
      C: { vraag: "Watter goedere het van die noorde af na Timboektoe gekom?", antwoord: "Sout, perde en koperkrale.", afleiers: ["Goud, ivoor en slawe.", "Rys, suiker en katoen.", "Wapens en gereedskap uit Amerika."] }
    }},
    { konsep: "Ibn Battuta", variante: {
      A: { vraag: "Wie was Ibn Battuta?", antwoord: "'n Moslem-reisiger wat tussen 1325 en 1354 Wes- en Oos-Afrika besoek het.", afleiers: ["'n Argitek wat moskees in Mali gebou het.", "'n Slawe-eienaar in Amerika.", "Die koning van Songhai."] },
      B: { vraag: "Wat het Ibn Battuta belangrik gemaak as 'n geskiedkundige bron?", antwoord: "Hy het alles wat hy gesien het neergeskryf, sodat ons vandag daaroor kan lees.", afleiers: ["Hy het die eerste moskee in Mali gebou.", "Hy het die Arabiese syfers uitgevind.", "Hy het die Ondergrondse Spoorweg gestig."] },
      C: { vraag: "Wat het Ibn Battuta oor die mense van Wes-Afrika gesê?", antwoord: "Dat hulle selde onregverdig was en 'n groot afkeer aan onregverdigheid gehad het.", afleiers: ["Dat hulle baie wreed en oneerlik was.", "Dat hulle geen wette gehad het nie.", "Dat hulle nooit handel gedryf het nie."] }
    }},
    { konsep: "Leo Africanus", variante: {
      A: { vraag: "Wie was Leo Africanus?", antwoord: "'n Moslem-reisiger, gebore in 1485 in Spanje, wat Timboektoe twee keer in die vroeë 1500's besoek het.", afleiers: ["'n Slaaf wat in 1789 'n boek geskryf het.", "Die argitek van die Groot Moskee van Djenné.", "Die stigter van die koninkryk Ghana."] },
      B: { vraag: "Wat is die naam van Leo Africanus se beroemde boek, en wanneer is dit gepubliseer?", antwoord: "'Description of Africa', gepubliseer in 1550.", afleiers: ["'The Life of Olaudah Equiano', in 1789.", "'Description of Africa', in 1230.", "'Travels in Asia', in 1325."] },
      C: { vraag: "Hoekom is Leo Africanus belangrik?", antwoord: "Hy is 'n belangrike bron van kennis oor Wes-Afrika.", afleiers: ["Hy het die katoenpluismeul uitgevind.", "Hy het die eerste hospitaal in Amerika gebou.", "Hy het slawe via die Ondergrondse Spoorweg gehelp."] }
    }},
    { konsep: "Vakke in Timboektoe se leersentrums", variante: {
      A: { vraag: "Watter vakke is in Timboektoe se leersentrums gedoseer?", antwoord: "Onder andere sterrekunde, wiskunde (al-jabr), chemie, fisika, geskiedenis, geografie en Islam-wet.", afleiers: ["Net die lees van die Koran, niks anders nie.", "Net kuns en musiek.", "Net landbou en visvang."] },
      B: { vraag: "Wat beteken die Arabiese woord 'al-jabr' vandag?", antwoord: "Algebra.", afleiers: ["Sterrekunde.", "Aardrykskunde.", "Geskiedenis."] },
      C: { vraag: "By watter moskee was een van Timboektoe se beroemde leersentrums?", antwoord: "Die Sankore-moskee.", afleiers: ["Die Groot Moskee van Djenné.", "Die moskee in Mekka.", "Die Ahmed Baba-katedraal."] }
    }},
    { konsep: "Arabiese syfers en wiskunde", variante: {
      A: { vraag: "Watter wiskundige stelsel het die Arabiere aan die wêreld gegee?", antwoord: "Die Arabiese syfers (0 tot 9) wat ons vandag nog gebruik.", afleiers: ["Die Romeinse syfers (I, V, X).", "Die Egiptiese prentjie-syfers.", "Die Griekse letter-syfers."] },
      B: { vraag: "Wat het die Arabiese syfers in Europa vervang?", antwoord: "Die ou Romeinse syfers.", afleiers: ["Die Arabiese letters.", "Die Egiptiese hiërogliewe.", "Die Chinese karakters."] },
      C: { vraag: "Watter ander wiskundige en tydhou-bydraes het van die Arabiere gekom?", antwoord: "Algebra (al-jabr) en die verdeling van die dag in 24 uur (met 'n waterhorlosie).", afleiers: ["Die uitvind van die rekenaar.", "Die meet van die spoed van lig.", "Die uitvind van die sonbril."] }
    }},
    { konsep: "Arabiese sterrekunde en navigasie", variante: {
      A: { vraag: "Watter ontdekking oor die Aarde het Arabiese sterrekundiges gemaak?", antwoord: "Dat die Aarde rond is en om die son draai — eeue voordat Europa dit aanvaar het.", afleiers: ["Dat die Aarde plat is en die son om dit draai.", "Dat die Aarde die middel van die heelal is.", "Dat daar geen sterre buite ons sonnestelsel is nie."] },
      B: { vraag: "Watter navigasie-instrumente het die Arabiere ontwikkel?", antwoord: "Die astrolabium en die kwadrant.", afleiers: ["Die teleskoop en die mikroskoop.", "Die kompas-app en die GPS.", "Die verkyker en die kamera."] },
      C: { vraag: "Waarvoor is die astrolabium en kwadrant gebruik?", antwoord: "Om te meet hoe hoog sterre bokant die horison is, sodat reisigers hul plek kon bepaal.", afleiers: ["Om die gewig van goud te meet.", "Om die temperatuur van die woestyn te meet.", "Om die diepte van die see te meet."] }
    }},
    { konsep: "Arabiese mediese ontdekkings", variante: {
      A: { vraag: "Watter belangrike mediese ontdekking het Arabiese dokters as die eerste gemaak?", antwoord: "Dat sommige siektes (soos pokke, masels en TB) aansteeklik is — siek mense steek gesonde mense aan.", afleiers: ["Dat alle siektes deur die weer veroorsaak word.", "Dat siektes nooit van een persoon na 'n ander oorgedra kan word nie.", "Dat siektes deur bose geeste veroorsaak word."] },
      B: { vraag: "Watter mediese instelling het Arabiese dokters as die eerste opgerig?", antwoord: "Die eerste hospitale.", afleiers: ["Die eerste apteke in Amerika.", "Die eerste mediese skole in Europa.", "Die eerste tandartspraktyke."] },
      C: { vraag: "Wie het Arabiese, Hebreeuse en Latynse mediese terme in een boek gekombineer?", antwoord: "Leo Africanus.", afleiers: ["Ibn Battuta.", "Mansa Musa.", "Ahmed Baba."] }
    }},
    { konsep: "Die Manuskripte van Timboektoe", variante: {
      A: { vraag: "In watter taal is die Manuskripte van Timboektoe geskryf?", antwoord: "In Arabies.", afleiers: ["In Engels.", "In Latyn.", "In Afrikaans."] },
      B: { vraag: "Watter land het in 2001 gehelp om die Ahmed Baba-sentrum vir die manuskripte op te stel?", antwoord: "Suid-Afrika.", afleiers: ["Egipte.", "Brittanje.", "Spanje."] },
      C: { vraag: "Wie was Ahmed Baba?", antwoord: "Die bekendste geleerde in Timboektoe in die 16de eeu.", afleiers: ["'n Argitek wat moskees gebou het.", "'n Slaaf wat 'n opstand gelei het.", "'n Europese seevaarder."] }
    }},
    { konsep: "Timboektoe as Wêrelderfenisgebied", variante: {
      A: { vraag: "Hoekom is Timboektoe 'n Wêrelderfenisgebied?", antwoord: "Sy moskees in die tradisionele Wes-Afrikaanse styl het 'n belangrike rol gespeel in die verspreiding van Islam in Afrika.", afleiers: ["Omdat dit die grootste goudmyn ter wêreld het.", "Omdat dit die hoofstad van Egipte is.", "Omdat die eerste motor daar gebou is."] },
      B: { vraag: "Wie het Timboektoe 'n Wêrelderfenisgebied verklaar?", antwoord: "Die Verenigde Nasies (VN).", afleiers: ["Die regering van Amerika.", "Die koning van Mali.", "Die Portugese seevaarders."] },
      C: { vraag: "Wat bedreig Timboektoe se erfenis-geboue vandag?", antwoord: "Die sand van die Saharawoestyn wat al nader kruip.", afleiers: ["Groot oorstromings van die see.", "Sneeustorms in die winter.", "Aardbewings elke jaar."] }
    }},
    { konsep: "Mondelinge oorlewering as bron", variante: {
      A: { vraag: "Wat is mondelinge oorlewering?", antwoord: "Kennis oor die verlede wat as stories van geslag na geslag oorvertel word en nie neergeskryf is nie.", afleiers: ["Boeke wat in Arabies geskryf is.", "Foto's en kaarte van die verlede.", "Amptelike regeringsdokumente."] },
      B: { vraag: "Watter drie soorte bronne gebruik historici om die verlede te bestudeer?", antwoord: "Mondelinge oorlewering, geskrifte en visuele bronne.", afleiers: ["Net mondelinge oorlewering.", "Net televisie en radio.", "Net die internet."] },
      C: { vraag: "Noem 'n voorbeeld van 'n geskrewe bron oor Wes-Afrika.", antwoord: "Die geskrifte van Ibn Battuta of Leo Africanus.", afleiers: ["Die kora-musiek van die Jali.", "Die modder-mure van Djenné.", "Die kamele van die karavane."] }
    }},
    { konsep: "Wes-Afrika se kultuur voor die slawehandel", variante: {
      A: { vraag: "Wat het Wes-Afrikane voor die slawehandel oor hul voorouers geglo?", antwoord: "Dat hul gestorwe voorouers oor hulle waghou.", afleiers: ["Dat voorouers heeltemal verdwyn ná die dood.", "Dat voorouers in diere verander.", "Dat voorouers na Europa reis ná die dood."] },
      B: { vraag: "Hoe het Wes-Afrikane met hul voorouers probeer kommunikeer?", antwoord: "Met godsdienstige rituele en koramusiek (die Afrika-harp).", afleiers: ["Met geskrewe briewe.", "Met die astrolabium.", "Met kaurieskulpe as offers."] },
      C: { vraag: "Wat het liedere, volkspreke en fabels in die samelewing oorgedra?", antwoord: "Die waardes van die samelewing, soos vindingrykheid, dapperheid en kennis van die natuur.", afleiers: ["Net die name van die konings.", "Net resepte vir kos.", "Net die pryse van handelsware."] }
    }},
    { konsep: "Hoe mense in Afrika slawe geword het", variante: {
      A: { vraag: "Wat is een hoofrede waarom mense in Afrika slawe geword het?", antwoord: "Hulle is as krygsgevangenes geneem ná 'n oorlog.", afleiers: ["Hulle het vrywillig aansoek gedoen om slawe te word.", "Hulle is deur Europese skepe ontvoer uit hul huise se vensters.", "Hulle het 'n eksamen gedruip."] },
      B: { vraag: "Hoe het 'n misdadiger in Afrika 'n slaaf geword?", antwoord: "Slawerny is as 'n straf vir 'n misdaad opgelê.", afleiers: ["'n Misdadiger is altyd net beboet.", "'n Misdadiger is na Europa gestuur.", "'n Misdadiger is altyd doodgemaak."] },
      C: { vraag: "Wat was 'pandskap' as 'n manier om 'n slaaf te word?", antwoord: "'n Jong meisie is as sekuriteit vir 'n gesin se skuld gegee; as die skuld nie betaal is nie, het sy dit afgewerk.", afleiers: ["'n Persoon is in 'n oorlog gevang.", "'n Persoon is gestraf vir 'n misdaad.", "'n Persoon het homself by 'n mark verkoop vir goud."] }
    }},
    { konsep: "Slawerny in Afrika vs. Amerika", variante: {
      A: { vraag: "Hoe het slawerny in Afrika van slawerny in Amerika verskil?", antwoord: "In Afrika kon slawe trou en kinders hê en het dikwels as amptenare en adviseurs gedien.", afleiers: ["In Afrika is slawe altyd net as goedere behandel.", "In Afrika kon slawe nooit deel van die gemeenskap wees nie.", "In Afrika is slawe nooit toegelaat om te werk nie."] },
      B: { vraag: "Wat was die 'klandistie stelsel' in Afrika?", antwoord: "'n Slaaf skuld 'n deel van sy oes of arbeid en neem steeds deel aan die gemeenskaplike lewe.", afleiers: ["'n Stelsel waar slawe heeltemal vrygelaat is.", "'n Stelsel waar slawe net op skepe gewerk het.", "'n Stelsel waar slawe nooit kos gekry het nie."] },
      C: { vraag: "Hoe is slawe in Amerika behandel?", antwoord: "As slegs eiendom, sonder enige regte.", afleiers: ["As betaalde werkers met volle regte.", "As deel van die eienaar se familie.", "As amptenare en adviseurs van die regering."] }
    }},
    { konsep: "Trans-Sahara vs. trans-Atlantiese slawehandel", variante: {
      A: { vraag: "Hoeveel slawe per jaar is gemiddeld in die trans-Sahara slawehandel verhandel?", antwoord: "Ongeveer 7 000 slawe per jaar (±750 tot 1850 n.C.).", afleiers: ["Ongeveer 12 tot 15 miljoen per jaar.", "Ongeveer 40 000 per jaar.", "Ongeveer 100 per jaar."] },
      B: { vraag: "Hoeveel slawe is in totaal in die trans-Atlantiese slawehandel verhandel?", antwoord: "Ongeveer 12 tot 15 miljoen slawe (±1500 tot 1850).", afleiers: ["Ongeveer 7 000 in totaal.", "Ongeveer 300 in totaal.", "Ongeveer 60 000 in totaal."] },
      C: { vraag: "Waarheen is slawe in die trans-Atlantiese slawehandel geneem?", antwoord: "Na Noord- en Suid-Amerika en die Wes-Indiese Eilande.", afleiers: ["Net na Noord-Afrika.", "Net na Europa.", "Net na Asië."] }
    }},
    { konsep: "Slawe gevang en in fortes gehou", variante: {
      A: { vraag: "Hoe is mense gewoonlik gevang om slawe te word vir die trans-Atlantiese handel?", antwoord: "Deur oorlog — en dan geruil vir gewere, yster of materiaal.", afleiers: ["Deur vrywillig by die fortes aan te meld.", "Deur eksamens te druip.", "Deur skuld by die bank te maak."] },
      B: { vraag: "Ongeveer hoeveel ysterstawe is in 1700 vir een slaaf geruil?", antwoord: "Ongeveer 600 ysterstawe.", afleiers: ["Ongeveer 6 ysterstawe.", "Ongeveer 60 000 ysterstawe.", "Net 1 ysterstaaf."] },
      C: { vraag: "Waar is gevange mense gehou voordat die slaweskepe aangekom het?", antwoord: "In sterk fortes langs die kus.", afleiers: ["In hul eie huise.", "In moskees in Timboektoe.", "Op die plantasies in Amerika."] }
    }},
    { konsep: "Die Middelvaart (toestande op die slaweskip)", variante: {
      A: { vraag: "Hoe was die toestande op die slaweskepe tydens die Middelvaart?", antwoord: "Mense was aanmekaar vasgeketting in klein plekke, kon skaars asemhaal, en die lug was baie ongesond.", afleiers: ["Elke slaaf het 'n eie kajuit met 'n bed gehad.", "Hulle is goed gevoed en kon vrylik op die dek rondloop.", "Die skepe was leeg en gemaklik."] },
      B: { vraag: "Ongeveer hoe lank het die Middelvaart oor die Atlantiese Oseaan geduur?", antwoord: "Ongeveer twee maande.", afleiers: ["Ongeveer twee dae.", "Ongeveer twee jaar.", "Ongeveer twee weke."] },
      C: { vraag: "Ongeveer watter deel van die slawe het tydens die vaart gesterf?", antwoord: "Ongeveer 'n kwart (25%).", afleiers: ["Ongeveer 1%.", "Byna almal (95%).", "Niemand het gesterf nie."] }
    }},
    { konsep: "Olaudah Equiano", variante: {
      A: { vraag: "Wie was Olaudah Equiano?", antwoord: "'n Kind wat as slaaf gevang is en later sy ervarings neergeskryf het.", afleiers: ["'n Slawe-eienaar in Amerika.", "Die kaptein van die slaweskip Amistad.", "'n Argitek in Mali."] },
      B: { vraag: "Wat is die naam van Olaudah Equiano se boek en wanneer is dit geskryf?", antwoord: "'The Life of Olaudah Equiano the African', in 1789.", afleiers: ["'Description of Africa', in 1550.", "'The Life of Olaudah Equiano the African', in 1230.", "'Travels in Africa', in 1900."] },
      C: { vraag: "Hoekom is Olaudah Equiano se boek so belangrik?", antwoord: "Dit is een van die beste eerstehandse beskrywings van toestande op slaweskepe en die slawebestaan.", afleiers: ["Dit was die eerste wiskundeboek in Afrika.", "Dit het die Arabiese syfers verduidelik.", "Dit was 'n boek oor die bou van moskees."] }
    }},
    { konsep: "Gewasse op die Amerikaanse plantasies", variante: {
      A: { vraag: "Watter gewasse is op die Amerikaanse plantasies verbou?", antwoord: "Tabak, rys, suikerriet en katoen.", afleiers: ["Sout, koper en goud.", "Tee, koffie en porselein.", "Olyfolie, wyn en koring net."] },
      B: { vraag: "Wie het die katoenpluismeul uitgevind?", antwoord: "Eli Whitney.", afleiers: ["Olaudah Equiano.", "Harriet Tubman.", "Mansa Musa."] },
      C: { vraag: "Hoe het die getal slawe in Amerika van 1800 tot 1860 verander?", antwoord: "Dit het van ongeveer 200 000 (1800) tot ongeveer 4 miljoen (1860) gegroei.", afleiers: ["Dit het van 4 miljoen tot 200 000 afgeneem.", "Dit het presies dieselfde gebly.", "Dit het tot nul gedaal."] }
    }},
    { konsep: "Slawemarkte in Amerika", variante: {
      A: { vraag: "Watter regte het slawe op die slawemarkte gehad wanneer hulle verkoop is?", antwoord: "Geen regte nie — 'n slaaf was die wettige eiendom van sy eienaar.", afleiers: ["Volle regte, soos enige vrye burger.", "Die reg om te stem.", "Die reg om self te besluit aan wie hy verkoop word."] },
      B: { vraag: "Wat het dikwels met slawegesinne op die markte gebeur?", antwoord: "Gesinne is verdeel — kinders is aan verskillende eienaars verkoop en het mekaar dikwels nooit weer gesien nie.", afleiers: ["Gesinne is altyd saam verkoop en bymekaar gehou.", "Gesinne is vrygelaat sodra hulle verkoop is.", "Gesinne is terug na Afrika gestuur."] },
      C: { vraag: "Ongeveer hoeveel het slawe in Amerika gekos vergeleke met die prys in Afrika?", antwoord: "Ongeveer drie maal die prys wat in Afrika betaal is.", afleiers: ["Presies dieselfde prys.", "Die helfte van die Afrika-prys.", "Slawe was gratis in Amerika."] }
    }},
    { konsep: "Die driesydige handel", variante: {
      A: { vraag: "In die driesydige handel — wat is van Europa na Wes-Afrika geneem?", antwoord: "Wapens, klere en gereedskap (om slawe mee te koop).", afleiers: ["Suiker, katoen en tabak.", "Slawe vir die plantasies.", "Goud en ivoor."] },
      B: { vraag: "In die driesydige handel — wat is van Wes-Afrika na Amerika geneem?", antwoord: "Slawe, vir arbeid op die plantasies.", afleiers: ["Wapens en gereedskap.", "Suiker en tabak.", "Sout en koper."] },
      C: { vraag: "In die driesydige handel — wat is van Amerika na Europa geneem?", antwoord: "Suiker, katoen, tabak en rys.", afleiers: ["Wapens en klere.", "Slawe.", "Goud, ivoor en sout."] }
    }},
    { konsep: "Hoe slawe op die plantasies behandel is", variante: {
      A: { vraag: "Hoe is slawe op die plantasies behandel?", antwoord: "Hulle is geslaan en gestraf vir enigiets en het in klein, ongemaklike hutte gewoon.", afleiers: ["Hulle is met groot respek en goeie lone behandel.", "Hulle het in groot, gemaklike huise gewoon.", "Hulle het kort werkdae en lang vakansies gehad."] },
      B: { vraag: "Watter twee dinge mag slawe op die plantasies NIE doen nie?", antwoord: "Hulle kon nie lees of skryf nie en kon nie sonder toestemming die plantasie verlaat nie.", afleiers: ["Hulle kon nie eet of slaap nie.", "Hulle kon nie praat of loop nie.", "Hulle kon nie asemhaal in die hutte nie."] },
      C: { vraag: "Hoekom het baie slawe op die plantasies nie lank geleef nie?", antwoord: "Hulle was dikwels siek, en die hutte was baie koud in die winter en warm in die somer.", afleiers: ["Hulle het te veel kos gekry.", "Hulle het te min gewerk.", "Hulle is na Afrika teruggestuur sodra hulle siek geword het."] }
    }},
    { konsep: "Slawekultuur: musiek en tradisie", variante: {
      A: { vraag: "Hoe het slawe hul Afrika-kultuur in Amerika bewaar?", antwoord: "Deur musiek, liedere en danse — hulle het Afrika-tradisies met nuwe gewoontes vermeng.", afleiers: ["Deur boeke in Arabies te skryf.", "Deur moskees in die Wes-Afrikaanse styl te bou.", "Deur terug na Afrika te reis vir vakansies."] },
      B: { vraag: "Watter moderne musieksoorte kom van die musiek van slawe?", antwoord: "Jazz en blues.", afleiers: ["Klassieke opera.", "Middeleeuse kerkmusiek.", "Elektroniese dansmusiek van die 1900's."] },
      C: { vraag: "Hoekom was tromme op sommige plantasies verbied?", antwoord: "Eienaars was bang dat tromme gebruik word om 'n opstand te beplan.", afleiers: ["Tromme was te duur om te koop.", "Tromme het die gewasse beskadig.", "Tromme is in plaas daarvan vir handel gebruik."] }
    }},
    { konsep: "Soorte weerstand teen slawerny", variante: {
      A: { vraag: "Wat was 'onopsigtelike' (versteekte) weerstand deur slawe?", antwoord: "Hulself siek maak, gereedskap of geboue aan die brand steek, stadig werk, of die baas aanval.", afleiers: ["Openlik 'n leër teen die regering oprig.", "'n Boek skryf en publiseer.", "Na die hof gaan om hul vryheid te eis."] },
      B: { vraag: "Watter ontsnappingsroete het slawe gebruik om vry te word?", antwoord: "Hulle het na die moerasse (soos by New Orleans) of na die Noorde gevlug, dikwels via die Ondergrondse Spoorweg.", afleiers: ["Hulle het per skip terug na Afrika gevaar.", "Hulle het na Europa gevlieg.", "Hulle het in die woestyn gaan wegkruip."] },
      C: { vraag: "Noem een voorbeeld van weerstand wat 'n slaaf onopsigtelik kon gebruik.", antwoord: "Stadig werk of die gereedskap opsetlik breek.", afleiers: ["'n Groot openbare optog hou.", "'n Brief aan die koning skryf.", "'n Verkiesing wen."] }
    }},
    { konsep: "Nat Turner se opstand (1831)", variante: {
      A: { vraag: "Wie was Nat Turner?", antwoord: "'n Slaaf in Virginia wat kon lees en skryf en 'n prediker was.", afleiers: ["'n Wit slawe-eienaar.", "Die kaptein van die Amistad.", "'n Europese sendelinge."] },
      B: { vraag: "Wat het Nat Turner in 1831 gedoen?", antwoord: "Hy het 'n slawe-opstand gelei met meer as 60 slawe.", afleiers: ["Hy het die Ondergrondse Spoorweg gestig.", "Hy het 'n boek oor slawerny geskryf.", "Hy het 'n regeringsarsenaal aangeval."] },
      C: { vraag: "Wat was die gevolg van Nat Turner se opstand?", antwoord: "Strenger wette is ingestel en die lewe vir slawe het nog moeiliker geword.", afleiers: ["Slawerny is dadelik in die hele Amerika afgeskaf.", "Alle slawe is onmiddellik vrygelaat.", "Daar was geen gevolge nie."] }
    }},
    { konsep: "Die Amistad-muitery (1839)", variante: {
      A: { vraag: "Wie het die Amistad-muitery in 1839 gelei?", antwoord: "Joseph Cinque.", afleiers: ["Nat Turner.", "John Brown.", "Harriet Tubman."] },
      B: { vraag: "Wat het Joseph Cinque op die slaweskip Amistad gedoen?", antwoord: "Hy het die bemanning doodgemaak en beheer van die skip oorgeneem.", afleiers: ["Hy het die skip na Amerika toe gestuur en homself oorgegee.", "Hy het die skip aan die brand gesteek.", "Hy het die slawe aan 'n nuwe eienaar verkoop."] },
      C: { vraag: "Wat was die uitkoms van die Amistad-saak in die hof?", antwoord: "Die hof het besluit die slawe is vry, en 35 van hulle het na Sierra Leone teruggekeer.", afleiers: ["Almal is teruggestuur na die plantasies.", "Joseph Cinque is tereggestel.", "Die slawe is na Europa verkoop."] }
    }},
    { konsep: "Die Ondergrondse Spoorweg en Harriet Tubman", variante: {
      A: { vraag: "Wat was die Ondergrondse Spoorweg?", antwoord: "'n Geheime netwerk van roetes en skuilplekke wat slawe gehelp het om van die Suide na vryheid te vlug.", afleiers: ["'n Werklike spoorlyn wat onder die grond gebou is.", "'n Mark waar slawe verkoop is.", "'n Skeepsdiens wat slawe na Afrika teruggeneem het."] },
      B: { vraag: "Ongeveer hoeveel slawe het die Ondergrondse Spoorweg gehelp om te ontsnap?", antwoord: "Ongeveer 100 000 slawe.", afleiers: ["Ongeveer 100 slawe.", "Ongeveer 10 miljoen slawe.", "Net 35 slawe."] },
      C: { vraag: "Wat het Harriet Tubman vir die Ondergrondse Spoorweg gedoen?", antwoord: "Sy het 19 keer na die Suide teruggegaan en meer as 300 slawe bevry.", afleiers: ["Sy het die wette teen slawerny geskryf.", "Sy het die slaweskip Amistad oorgeneem.", "Sy het 'n regeringsarsenaal aangeval."] }
    }},
    { konsep: "John Brown", variante: {
      A: { vraag: "Wie was John Brown?", antwoord: "Iemand van 'n noordelike familie wat geglo het slawerny moet met geweld afgeskaf word.", afleiers: ["'n Slawe-eienaar in die Suide.", "Die kaptein van die Amistad.", "'n Slaaf in Virginia."] },
      B: { vraag: "Wat het John Brown in 1859 gedoen?", antwoord: "Hy het 'n regeringsarsenaal aangeval om wapens te kry vir 'n slawe-rebellie.", afleiers: ["Hy het die Ondergrondse Spoorweg gestig.", "Hy het 'n boek oor sy slawe-ervarings geskryf.", "Hy het die Amistad oorgeneem."] },
      C: { vraag: "Wat het met John Brown gebeur ná sy aanval, en hoe is hy in die Noorde onthou?", antwoord: "Hy is gevang, vir moord en hoogverraad verhoor en gehang — in die Noorde is hy as 'n martelaar beskou.", afleiers: ["Hy is vrygelaat en het president geword.", "Hy het ontsnap en na Afrika gevlug.", "Hy is beloon deur die slawe-eienaars."] }
    }},
    { konsep: "Die impak van die slawehandel", variante: {
      A: { vraag: "Wat was die impak van die slawehandel op Wes-Afrika?", antwoord: "Miljoene jong mense is weggeneem, daar was meer oorloë, en die ekonomie het afhanklik geword van Europese goedere.", afleiers: ["Wes-Afrika het die rykste gebied ter wêreld geword.", "Wes-Afrika se bevolking het vinnig gegroei.", "Wes-Afrika het heeltemal onaangeraak gebly."] },
      B: { vraag: "Wat was die impak van die slawehandel op Amerika?", antwoord: "Die plantasies het ryk geword; teen 1860 was daar ongeveer 4 miljoen slawe en katoen het die ekonomie oorheers.", afleiers: ["Amerika het al sy slawe in 1800 vrygelaat.", "Amerika het arm geword weens die handel.", "Amerika het geen plantasies gehad nie."] },
      C: { vraag: "Wat was die impak van die slawehandel op Brittanje?", antwoord: "Brittanje was die grootste deelnemer; dit het die grootste ekonomie geword en het die Industriële Revolusie help finansier.", afleiers: ["Brittanje het nooit aan die slawehandel deelgeneem nie.", "Brittanje het al sy rykdom verloor.", "Brittanje het die kleinste ekonomie ter wêreld geword."] }
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

  // WhatsApp-kennisgewing na Ian se ouer via Make.com
  if (WA_AKTIEF && score !== null && totaal > 0) {
    const persentasie = Math.round((score / totaal) * 100);
    const slaag      = persentasie >= SLAAGPUNT ? '✅ GESLAAG' : '❌ Nie geslaag nie';
    const vakNaam    = (VAKKE.find(function(v){ return v.kode === meta.vak; }) || { etiket: meta.vak }).etiket;
    const pogings    = meta.poging + ' van ' + POGINGS.length;
    const boodskap   =
      '📚 *Ian se Toetsuitslag*\n' +
      '━━━━━━━━━━━━━━━━━━━\n' +
      '📖 Vak: ' + vakNaam + '\n' +
      '🔢 Poging: Toets ' + pogings + '\n' +
      '🎯 Telling: ' + score + '/' + totaal + ' (' + persentasie + '%)\n' +
      '🏁 Uitkoms: ' + slaag + '\n' +
      '📏 Slaagpunt: ' + SLAAGPUNT + '%\n' +
      '━━━━━━━━━━━━━━━━━━━\n' +
      '🕐 ' + (tydstempel instanceof Date ? tydstempel.toLocaleString('af-ZA') : tydstempel);
    stuurWhatsApp(boodskap);
  }
}

// ===== WHATSAPP-KENNISGEWING via Make.com (scenario: "Claude Send WhatsApp") =====
// Payload volg dieselfde struktuur as die bestaande scenario:
//   { "to": "27XXXXXXXXX", "message": "...", "image_url": "" }
// Leë image_url stuur die boodskap via die "No image_url"-roete (teks-boodskap).
function stuurWhatsApp(boodskap) {
  if (!WA_AKTIEF) return;
  try {
    const payload = JSON.stringify({
      to:        WA_ONTVANGER,
      message:   boodskap,
      image_url: ''          // leeg = teks-roete in die Make.com router
    });
    const opsies = {
      method:             'post',
      contentType:        'application/json',
      payload:            payload,
      muteHttpExceptions: true
    };
    const reaksie = UrlFetchApp.fetch(MAKE_WA_WEBHOOK, opsies);
    Logger.log('Make.com WhatsApp gestuur na %s — status: %s', WA_ONTVANGER, reaksie.getResponseCode());
  } catch (err) {
    Logger.log('WhatsApp kon nie gestuur word nie: %s', err);
  }
}

// ===== TOETS WHATSAPP (hardloop handmatig om die stelsel te toets) =====
function toetsWhatsApp() {
  stuurWhatsApp(
    '🔔 Toets-boodskap van Ian se Eksamen-Plan\n' +
    'As jy dit ontvang werk die Make.com WhatsApp-koppeling! ✅\n' +
    'Voortaan sal jy \'n kennisgewing kry elke keer Ian \'n toets indien.'
  );
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

// ===== HERBOU NET GESKIEDENIS-VORMS =====
// Hardloop hierdie EENMALIG in die Apps Script-redakteur om:
//   1. Die ou stub-Geskiedenisvorms te verwyder
//   2. Drie nuwe kwis-vorms (Toets 1/2/3) met volledige vrae te skep
//   3. Die formId-map en sneller by te werk sonder om ander vakke te raak
// Die nuwe form-URLs verskyn in View → Logs — plak hulle in FORM_URLS in index.html.
function herboueGeskiedenisVorms() {
  const props = PropertiesService.getScriptProperties();
  const masterSheetId = props.getProperty(PROP_MASTER_SHEET_ID);
  if (!masterSheetId) {
    throw new Error('Geen master sheet ID nie. Hardloop bouAlles() of konsolideerInstellings() eers.');
  }
  const sheet = SpreadsheetApp.openById(masterSheetId);
  const formMap = JSON.parse(props.getProperty(PROP_FORM_MAP) || '{}');

  const geskVak = VAKKE.find(v => v.kode === 'geskiedenis');
  if (!geskVak) throw new Error('Geskiedenis-vak nie gevind in VAKKE-lys nie.');

  // Vee die ou stub-Geskiedenisvorms uit (soek op titel)
  POGINGS.forEach(function(poging) {
    const titel = geskVak.etiket + ' — ' + poging.etiket + ' (slaagpunt: ' + SLAAGPUNT + '%)';
    const files = DriveApp.getFilesByName(titel);
    while (files.hasNext()) {
      const f = files.next();
      // Verwyder die ou formId uit die map
      try {
        const oldFormId = FormApp.openById(f.getId()).getId();
        delete formMap[oldFormId];
      } catch (err) { /* ignoreer */ }
      f.setTrashed(true);
      Logger.log('Verwyder: %s', titel);
    }
  });

  // Skep drie nuwe vorms met volledige vrae
  POGINGS.forEach(function(poging) {
    const form = skepVormVirVak(geskVak, poging);
    koppelAanSheet(form, sheet);
    formMap[form.getId()] = { vak: geskVak.kode, poging: poging.nommer };
    Logger.log('Geskep: %s', form.getPublishedUrl());
  });

  // Stoor die bygewerkte map en herinstalleer die sneller
  props.setProperty(PROP_FORM_MAP, JSON.stringify(formMap));
  installeerSpreadsheetTrigger(sheet);

  Logger.log('===== KLAAR: Plak hierdie URLs in FORM_URLS.geskiedenis in index.html =====');
  Object.keys(formMap)
    .filter(id => formMap[id].vak === 'geskiedenis')
    .sort((a, b) => formMap[a].poging - formMap[b].poging)
    .forEach(function(id) {
      try {
        Logger.log('Toets %s: %s', formMap[id].poging, FormApp.openById(id).getPublishedUrl());
      } catch (err) { Logger.log('Kon nie URL kry vir form %s nie', id); }
    });
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
