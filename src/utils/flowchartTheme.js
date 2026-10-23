// src/utils/flowchartTheme.js
// "Oltin Sulola" (Royal Dynasty & Gold) Visual Theme Configuration

export const GENERATION_PALETTES = [
  {
    depth: 0,
    roman: 'Asoschi',
    icon: 'bi-crown-fill',
    title: 'Asoschi / Shajaraboshi',
    accent: '#F59E0B', // Imperial Gold
    border: '#EAB308',
    glow: 'rgba(234, 179, 8, 0.3)',
    bg: 'linear-gradient(135deg, #221C38 0%, #0F172A 100%)',
    badgeBg: '#362B16',
    badgeBorder: '#FACC15',
    badgeText: '#FEF08A',
    stemColor: '#EAB308'
  },
  {
    depth: 1,
    roman: 'I Avlod',
    icon: 'bi-gem',
    title: '1-avlod (Farzandlar / Aka-ukalar)',
    accent: '#38BDF8', // Royal Sapphire
    border: '#0284C7',
    glow: 'rgba(56, 189, 248, 0.3)',
    bg: 'linear-gradient(135deg, #0C2646 0%, #0F172A 100%)',
    badgeBg: '#082F49',
    badgeBorder: '#38BDF8',
    badgeText: '#BAE6FD',
    stemColor: '#38BDF8'
  },
  {
    depth: 2,
    roman: 'II Avlod',
    icon: 'bi-shield-shaded',
    title: '2-avlod (Nabiralar / Xolavachchalar)',
    accent: '#34D399', // Royal Emerald
    border: '#059669',
    glow: 'rgba(52, 211, 153, 0.3)',
    bg: 'linear-gradient(135deg, #062C22 0%, #0F172A 100%)',
    badgeBg: '#064E3B',
    badgeBorder: '#34D399',
    badgeText: '#A7F3D0',
    stemColor: '#34D399'
  },
  {
    depth: 3,
    roman: 'III Avlod',
    icon: 'bi-stars',
    title: '3-avlod (Evaralar)',
    accent: '#C084FC', // Royal Amethyst
    border: '#9333EA',
    glow: 'rgba(192, 132, 252, 0.3)',
    bg: 'linear-gradient(135deg, #2E104D 0%, #0F172A 100%)',
    badgeBg: '#3B0764',
    badgeBorder: '#C084FC',
    badgeText: '#E9D5FF',
    stemColor: '#C084FC'
  },
  {
    depth: 4,
    roman: 'IV Avlod',
    icon: 'bi-fire',
    title: '4-avlod (Chevaralar)',
    accent: '#FB923C', // Royal Amber / Bronze
    border: '#EA580C',
    glow: 'rgba(251, 146, 60, 0.3)',
    bg: 'linear-gradient(135deg, #32180C 0%, #0F172A 100%)',
    badgeBg: '#431407',
    badgeBorder: '#FB923C',
    badgeText: '#FED7AA',
    stemColor: '#FB923C'
  },
  {
    depth: 5,
    roman: 'V Avlod',
    icon: 'bi-flower1',
    title: '5-avlod (Duvoralar)',
    accent: '#F472B6', // Royal Rose Quartz
    border: '#DB2777',
    glow: 'rgba(244, 114, 182, 0.3)',
    bg: 'linear-gradient(135deg, #370E26 0%, #0F172A 100%)',
    badgeBg: '#500724',
    badgeBorder: '#F472B6',
    badgeText: '#FBCFE8',
    stemColor: '#F472B6'
  }
];

export function getGenerationStyle(depth = 0) {
  const safeDepth = Math.max(0, Number(depth) || 0);
  const paletteIndex = safeDepth % GENERATION_PALETTES.length;
  return GENERATION_PALETTES[paletteIndex];
}
