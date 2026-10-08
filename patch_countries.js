const fs = require('fs');

const missingCountriesStr = `
  "Belize": { uz: "Beliz", region: "namerica", subRegion: "central" },
  "Benin": { uz: "Benin", region: "africa", subRegion: "west" },
  "Bhutan": { uz: "Butan", region: "asia", subRegion: "south" },
  "Botswana": { uz: "Botsvana", region: "africa", subRegion: "south" },
  "Brunei": { uz: "Bruney", region: "asia", subRegion: "southeast" },
  "Burkina Faso": { uz: "Burkina-Faso", region: "africa", subRegion: "west" },
  "Burundi": { uz: "Burundi", region: "africa", subRegion: "east" },
  "Central African Republic": { uz: "Markaziy Afrika Respublikasi", region: "africa", subRegion: "central" },
  "Chad": { uz: "Chad", region: "africa", subRegion: "central" },
  "Djibouti": { uz: "Jibuti", region: "africa", subRegion: "east" },
  "East Timor": { uz: "Sharqiy Timor", region: "asia", subRegion: "southeast" },
  "Equatorial Guinea": { uz: "Ekvatorial Gvineya", region: "africa", subRegion: "central" },
  "Eritrea": { uz: "Eritreya", region: "africa", subRegion: "east" },
  "Gabon": { uz: "Gabon", region: "africa", subRegion: "central" },
  "Gambia": { uz: "Gambiya", region: "africa", subRegion: "west" },
  "Greenland": { uz: "Grenlandiya", region: "namerica", subRegion: "northern" },
  "Guinea": { uz: "Gvineya", region: "africa", subRegion: "west" },
  "Guinea Bissau": { uz: "Gvineya-Bisau", region: "africa", subRegion: "west" },
  "Guyana": { uz: "Gayana", region: "samerica", subRegion: "north" },
  "Kosovo": { uz: "Kosovo", region: "europe", subRegion: "balkan" },
  "Laos": { uz: "Laos", region: "asia", subRegion: "southeast" },
  "Lesotho": { uz: "Lesoto", region: "africa", subRegion: "south" },
  "Liberia": { uz: "Liberiya", region: "africa", subRegion: "west" },
  "Luxembourg": { uz: "Lyuksemburg", region: "europe", subRegion: "western" },
  "Macedonia": { uz: "Makedoniya", region: "europe", subRegion: "balkan" },
  "Malawi": { uz: "Malavi", region: "africa", subRegion: "east" },
  "Malta": { uz: "Malta", region: "europe", subRegion: "southern" },
  "Mauritania": { uz: "Mavritaniya", region: "africa", subRegion: "west" },
  "Montenegro": { uz: "Chernogoriya", region: "europe", subRegion: "balkan" },
  "Namibia": { uz: "Namibiya", region: "africa", subRegion: "south" },
  "Niger": { uz: "Niger", region: "africa", subRegion: "west" },
  "Republic of the Congo": { uz: "Kongo", region: "africa", subRegion: "central" },
  "Rwanda": { uz: "Ruanda", region: "africa", subRegion: "east" },
  "Sierra Leone": { uz: "Syerra-Leone", region: "africa", subRegion: "west" },
  "Solomon Islands": { uz: "Solomon Orollari", region: "oceania", subRegion: "main" },
  "South Sudan": { uz: "Janubiy Sudan", region: "africa", subRegion: "east" },
  "Suriname": { uz: "Surinam", region: "samerica", subRegion: "north" },
  "Swaziland": { uz: "Esvatini (Svazilend)", region: "africa", subRegion: "south" },
  "The Bahamas": { uz: "Bagama Orollari", region: "namerica", subRegion: "caribbean" },
  "Togo": { uz: "Togo", region: "africa", subRegion: "west" },
  "Trinidad and Tobago": { uz: "Trinidad va Tobago", region: "namerica", subRegion: "caribbean" },
  "Vanuatu": { uz: "Vanuatu", region: "oceania", subRegion: "main" }
`;

let content = fs.readFileSync('src/services/mapQuizService.js', 'utf8');

// Replace wrong keys
content = content.replace(/"Serbia": \{ uz: "Serbiya", region: "europe", subRegion: "balkan" \},/, '"Republic of Serbia": { uz: "Serbiya", region: "europe", subRegion: "balkan" },');
content = content.replace(/"Tanzania": \{ uz: "Tanzaniya", region: "africa", subRegion: "east" \},/, '"United Republic of Tanzania": { uz: "Tanzaniya", region: "africa", subRegion: "east" },');

// Append new ones at the bottom of UZ_COUNTRIES
content = content.replace(/};\s*export const REGIONS_CONFIG/, missingCountriesStr + '};\n\nexport const REGIONS_CONFIG');

fs.writeFileSync('src/services/mapQuizService.js', content);
