const fs = require('fs');

let content = fs.readFileSync('src/services/mapQuizService.js', 'utf8');

// Update UZ_COUNTRIES mapping with subRegions
content = content.replace(/export const UZ_COUNTRIES = \{[\s\S]*?\n\};/, `export const UZ_COUNTRIES = {
  // Asia
  "Afghanistan": { uz: "Afg'oniston", region: "asia", subRegion: "south" },
  "Armenia": { uz: "Armaniston", region: "asia", subRegion: "west" },
  "Azerbaijan": { uz: "Ozarbayjon", region: "asia", subRegion: "west" },
  "Bangladesh": { uz: "Bangladesh", region: "asia", subRegion: "south" },
  "Cambodia": { uz: "Kambodja", region: "asia", subRegion: "southeast" },
  "China": { uz: "Xitoy", region: "asia", subRegion: "east" },
  "Georgia": { uz: "Gruziya", region: "asia", subRegion: "west" },
  "India": { uz: "Hindiston", region: "asia", subRegion: "south" },
  "Indonesia": { uz: "Indoneziya", region: "asia", subRegion: "southeast" },
  "Iran": { uz: "Eron", region: "asia", subRegion: "west" },
  "Iraq": { uz: "Iroq", region: "asia", subRegion: "west" },
  "Israel": { uz: "Isroil", region: "asia", subRegion: "west" },
  "Japan": { uz: "Yaponiya", region: "asia", subRegion: "east" },
  "Jordan": { uz: "Iordaniya", region: "asia", subRegion: "west" },
  "Kazakhstan": { uz: "Qozog'iston", region: "asia", subRegion: "central" },
  "Kuwait": { uz: "Quvayt", region: "asia", subRegion: "west" },
  "Kyrgyzstan": { uz: "Qirg'iziston", region: "asia", subRegion: "central" },
  "Lebanon": { uz: "Livan", region: "asia", subRegion: "west" },
  "Malaysia": { uz: "Malayziya", region: "asia", subRegion: "southeast" },
  "Mongolia": { uz: "Mongoliya", region: "asia", subRegion: "east" },
  "Myanmar": { uz: "Myanma", region: "asia", subRegion: "southeast" },
  "Nepal": { uz: "Nepal", region: "asia", subRegion: "south" },
  "North Korea": { uz: "Shimoliy Koreya", region: "asia", subRegion: "east" },
  "Oman": { uz: "Ummon", region: "asia", subRegion: "west" },
  "Pakistan": { uz: "Pokiston", region: "asia", subRegion: "south" },
  "Philippines": { uz: "Filippin", region: "asia", subRegion: "southeast" },
  "Qatar": { uz: "Qatar", region: "asia", subRegion: "west" },
  "Saudi Arabia": { uz: "Saudiya Arabistoni", region: "asia", subRegion: "west" },
  "South Korea": { uz: "Janubiy Koreya", region: "asia", subRegion: "east" },
  "Sri Lanka": { uz: "Shri-Lanka", region: "asia", subRegion: "south" },
  "Syria": { uz: "Suriya", region: "asia", subRegion: "west" },
  "Taiwan": { uz: "Tayvan", region: "asia", subRegion: "east" },
  "Tajikistan": { uz: "Tojikiston", region: "asia", subRegion: "central" },
  "Thailand": { uz: "Tailand", region: "asia", subRegion: "southeast" },
  "Turkey": { uz: "Turkiya", region: "asia", subRegion: "west" },
  "Turkmenistan": { uz: "Turkmaniston", region: "asia", subRegion: "central" },
  "United Arab Emirates": { uz: "BAA", region: "asia", subRegion: "west" },
  "Uzbekistan": { uz: "O'zbekiston", region: "asia", subRegion: "central" },
  "Vietnam": { uz: "Vyetnam", region: "asia", subRegion: "southeast" },
  "Yemen": { uz: "Yaman", region: "asia", subRegion: "west" },

  // Europe
  "Albania": { uz: "Albaniya", region: "europe", subRegion: "balkan" },
  "Austria": { uz: "Avstriya", region: "europe", subRegion: "central" },
  "Belarus": { uz: "Belorussiya", region: "europe", subRegion: "eastern" },
  "Belgium": { uz: "Belgiya", region: "europe", subRegion: "western" },
  "Bosnia and Herzegovina": { uz: "Bosniya", region: "europe", subRegion: "balkan" },
  "Bulgaria": { uz: "Bolgariya", region: "europe", subRegion: "balkan" },
  "Croatia": { uz: "Xorvatiya", region: "europe", subRegion: "balkan" },
  "Cyprus": { uz: "Kipr", region: "europe", subRegion: "southern" },
  "Czech Republic": { uz: "Chexiya", region: "europe", subRegion: "central" },
  "Denmark": { uz: "Daniya", region: "europe", subRegion: "northern" },
  "Estonia": { uz: "Estoniya", region: "europe", subRegion: "northern" },
  "Finland": { uz: "Finlyandiya", region: "europe", subRegion: "northern" },
  "France": { uz: "Fransiya", region: "europe", subRegion: "western" },
  "Germany": { uz: "Germaniya", region: "europe", subRegion: "central" },
  "Greece": { uz: "Gretsiya", region: "europe", subRegion: "southern" },
  "Hungary": { uz: "Vengriya", region: "europe", subRegion: "central" },
  "Iceland": { uz: "Islandiya", region: "europe", subRegion: "northern" },
  "Ireland": { uz: "Irlandiya", region: "europe", subRegion: "western" },
  "Italy": { uz: "Italiya", region: "europe", subRegion: "southern" },
  "Latvia": { uz: "Latviya", region: "europe", subRegion: "northern" },
  "Lithuania": { uz: "Litva", region: "europe", subRegion: "northern" },
  "Moldova": { uz: "Moldova", region: "europe", subRegion: "eastern" },
  "Netherlands": { uz: "Niderlandiya", region: "europe", subRegion: "western" },
  "Norway": { uz: "Norvegiya", region: "europe", subRegion: "northern" },
  "Poland": { uz: "Polsha", region: "europe", subRegion: "eastern" },
  "Portugal": { uz: "Portugaliya", region: "europe", subRegion: "southern" },
  "Romania": { uz: "Ruminiya", region: "europe", subRegion: "eastern" },
  "Russia": { uz: "Rossiya", region: "europe", subRegion: "eastern" },
  "Serbia": { uz: "Serbiya", region: "europe", subRegion: "balkan" },
  "Slovakia": { uz: "Slovakiya", region: "europe", subRegion: "central" },
  "Slovenia": { uz: "Sloveniya", region: "europe", subRegion: "central" },
  "Spain": { uz: "Ispaniya", region: "europe", subRegion: "southern" },
  "Sweden": { uz: "Shvetsiya", region: "europe", subRegion: "northern" },
  "Switzerland": { uz: "Shveytsariya", region: "europe", subRegion: "western" },
  "Ukraine": { uz: "Ukraina", region: "europe", subRegion: "eastern" },
  "United Kingdom": { uz: "Buyuk Britaniya", region: "europe", subRegion: "western" },

  // Africa
  "Algeria": { uz: "Jazoir", region: "africa", subRegion: "north" },
  "Angola": { uz: "Angola", region: "africa", subRegion: "central" },
  "Cameroon": { uz: "Kamerun", region: "africa", subRegion: "central" },
  "Democratic Republic of the Congo": { uz: "Kongo DR", region: "africa", subRegion: "central" },
  "Egypt": { uz: "Misr", region: "africa", subRegion: "north" },
  "Ethiopia": { uz: "Efiopiya", region: "africa", subRegion: "east" },
  "Ghana": { uz: "Gana", region: "africa", subRegion: "west" },
  "Ivory Coast": { uz: "Kot-d'Ivuar", region: "africa", subRegion: "west" },
  "Kenya": { uz: "Keniya", region: "africa", subRegion: "east" },
  "Libya": { uz: "Liviya", region: "africa", subRegion: "north" },
  "Madagascar": { uz: "Madagaskar", region: "africa", subRegion: "east" },
  "Mali": { uz: "Mali", region: "africa", subRegion: "west" },
  "Morocco": { uz: "Marokash", region: "africa", subRegion: "north" },
  "Mozambique": { uz: "Mozambik", region: "africa", subRegion: "east" },
  "Nigeria": { uz: "Nigeriya", region: "africa", subRegion: "west" },
  "Senegal": { uz: "Senegal", region: "africa", subRegion: "west" },
  "Somalia": { uz: "Somali", region: "africa", subRegion: "east" },
  "South Africa": { uz: "J. Afrika Respublikasi", region: "africa", subRegion: "south" },
  "Sudan": { uz: "Sudan", region: "africa", subRegion: "north" },
  "Tanzania": { uz: "Tanzaniya", region: "africa", subRegion: "east" },
  "Tunisia": { uz: "Tunis", region: "africa", subRegion: "north" },
  "Uganda": { uz: "Uganda", region: "africa", subRegion: "east" },
  "Zambia": { uz: "Zambiya", region: "africa", subRegion: "east" },
  "Zimbabwe": { uz: "Zimbabve", region: "africa", subRegion: "east" },

  // North America
  "Canada": { uz: "Kanada", region: "namerica", subRegion: "northern" },
  "Costa Rica": { uz: "Kosta-Rika", region: "namerica", subRegion: "central" },
  "Cuba": { uz: "Kuba", region: "namerica", subRegion: "caribbean" },
  "Dominican Republic": { uz: "Dominikan R.", region: "namerica", subRegion: "caribbean" },
  "El Salvador": { uz: "Salvador", region: "namerica", subRegion: "central" },
  "Guatemala": { uz: "Gvatemala", region: "namerica", subRegion: "central" },
  "Haiti": { uz: "Gaiti", region: "namerica", subRegion: "caribbean" },
  "Honduras": { uz: "Gonduras", region: "namerica", subRegion: "central" },
  "Jamaica": { uz: "Yamayka", region: "namerica", subRegion: "caribbean" },
  "Mexico": { uz: "Meksika", region: "namerica", subRegion: "central" },
  "Nicaragua": { uz: "Nikaragua", region: "namerica", subRegion: "central" },
  "Panama": { uz: "Panama", region: "namerica", subRegion: "central" },
  "United States of America": { uz: "AQSh", region: "namerica", subRegion: "northern" },

  // South America
  "Argentina": { uz: "Argentina", region: "samerica", subRegion: "south" },
  "Bolivia": { uz: "Boliviya", region: "samerica", subRegion: "central" },
  "Brazil": { uz: "Braziliya", region: "samerica", subRegion: "central" },
  "Chile": { uz: "Chili", region: "samerica", subRegion: "south" },
  "Colombia": { uz: "Kolumbiya", region: "samerica", subRegion: "north" },
  "Ecuador": { uz: "Ekvador", region: "samerica", subRegion: "north" },
  "Paraguay": { uz: "Paragvay", region: "samerica", subRegion: "south" },
  "Peru": { uz: "Peru", region: "samerica", subRegion: "central" },
  "Uruguay": { uz: "Urugvay", region: "samerica", subRegion: "south" },
  "Venezuela": { uz: "Venesuela", region: "samerica", subRegion: "north" },

  // Oceania
  "Australia": { uz: "Avstraliya", region: "oceania", subRegion: "main" },
  "Fiji": { uz: "Fiji", region: "oceania", subRegion: "main" },
  "New Zealand": { uz: "Yangi Zelandiya", region: "oceania", subRegion: "main" },
  "Papua New Guinea": { uz: "Papua Yangi Gvineya", region: "oceania", subRegion: "main" },
};`);

// Update REGIONS_CONFIG with subRegions
content = content.replace(/export const REGIONS_CONFIG = \[[\s\S]*?\];/, `export const REGIONS_CONFIG = [
  { 
    id: 'world', name: 'Butun Dunyo', desc: 'Barcha qit\\'alardagi davlatlar aralashmasi.', icon: '🌍', mapIcon: 'bi-globe-americas', bg: '#475569', total: 130 
  },
  { 
    id: 'asia', name: 'Osiyo', desc: 'O\\'rta Osiyo, Sharqiy Osiyo va Yaqin Sharq hududlari.', icon: '🕌', mapIcon: 'bi-geo-alt-fill', bg: '#F59E0B', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'asia').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' },
      { id: 'central', name: 'Markaziy Osiyo' },
      { id: 'east', name: 'Sharqiy Osiyo' },
      { id: 'south', name: 'Janubiy Osiyo' },
      { id: 'southeast', name: 'Janubi-Sharqiy Osiyo' },
      { id: 'west', name: 'Yaqin Sharq' }
    ]
  },
  { 
    id: 'europe', name: 'Yevropa', desc: 'Markaziy, G\\'arbiy va Sharqiy Yevropa hududlari.', icon: '🏰', mapIcon: 'bi-geo-alt-fill', bg: '#3B82F6', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'europe').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' },
      { id: 'central', name: 'Markaziy Yevropa' },
      { id: 'western', name: 'G\\'arbiy Yevropa' },
      { id: 'eastern', name: 'Sharqiy Yevropa' },
      { id: 'balkan', name: 'Bolqon Davlatlari' },
      { id: 'northern', name: 'Shimoliy Yevropa' },
      { id: 'southern', name: 'Janubiy Yevropa' }
    ]
  },
  { 
    id: 'africa', name: 'Afrika', desc: 'Shimoliy, G\\'arbiy, Markaziy va Janubiy Afrika qit\\'asi.', icon: '🐘', mapIcon: 'bi-geo-alt-fill', bg: '#10B981', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'africa').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' },
      { id: 'north', name: 'Shimoliy Afrika' },
      { id: 'west', name: 'G\\'arbiy Afrika' },
      { id: 'central', name: 'Markaziy Afrika' },
      { id: 'east', name: 'Sharqiy Afrika' },
      { id: 'south', name: 'Janubiy Afrika' }
    ]
  },
  { 
    id: 'namerica', name: 'Shimoliy Amerika', desc: 'Kanada, AQSh hamda Markaziy Amerika.', icon: '🗽', mapIcon: 'bi-geo-alt-fill', bg: '#EC4899', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'namerica').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' },
      { id: 'northern', name: 'Shimoliy (Kanada, AQSh)' },
      { id: 'central', name: 'Markaziy Amerika' },
      { id: 'caribbean', name: 'Karib Havzasi' }
    ]
  },
  { 
    id: 'samerica', name: 'Janubiy Amerika', desc: 'Lotin Amerikasining eng yirik mintaqalari.', icon: '🦜', mapIcon: 'bi-geo-alt-fill', bg: '#8B5CF6', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'samerica').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' },
      { id: 'north', name: 'Shimoliy Qismi' },
      { id: 'central', name: 'Markaziy Qismi' },
      { id: 'south', name: 'Janubiy Qismi' }
    ]
  },
  { 
    id: 'oceania', name: 'Avstraliya va Okeaniya', desc: 'Tinch okeanidagi orol davlatlar.', icon: '🦘', mapIcon: 'bi-geo-alt-fill', bg: '#14B8A6', 
    total: Object.values(UZ_COUNTRIES).filter(c => c.region === 'oceania').length,
    subRegions: [
      { id: 'all', name: 'Barchasi' }
    ]
  }
];`);

// Modify generateMapQuestions to support subRegion filtering
content = content.replace(/export function generateMapQuestions\(geoJsonFeatures, limit, regionId\) \{[\s\S]*?return result;\n\}/, `export function generateMapQuestions(geoJsonFeatures, limit, regionId, subRegionId = 'all') {
  let pool = [];

  for (const feature of geoJsonFeatures) {
    const enName = feature.properties?.name;
    if (!enName) continue;

    const uzInfo = UZ_COUNTRIES[enName];
    if (uzInfo) {
      // Check main region
      if (regionId === 'world' || uzInfo.region === regionId) {
        // Check sub-region if specified and not 'all'
        if (subRegionId === 'all' || uzInfo.subRegion === subRegionId) {
          pool.push({
            id: feature.id || enName,
            enName: enName,
            uzName: uzInfo.uz,
            region: uzInfo.region
          });
        }
      }
    }
  }

  // Shuffle pool
  pool.sort(() => Math.random() - 0.5);

  const numQuestions = limit === 'all' ? pool.length : Math.min(limit, pool.length);
  const result = pool.slice(0, numQuestions);

  // Generate options (currently not heavily used for map clicks, but required by format)
  return result.map(q => {
    return {
      id: q.id,
      questionText: \`\${q.uzName}ni xaritadan toping\`,
      options: [q.uzName, 'Boshqa davlat'],
      correctIndex: 0,
      timeLimit: 20,
      points: 100,
      targetCountryEn: q.enName
    };
  });
}`);

fs.writeFileSync('src/services/mapQuizService.js', content, 'utf8');
