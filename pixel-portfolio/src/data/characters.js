// Playable heroes. `look` is only used by tools/make-hero.mjs to draw the sprite sheets
// (public/assets/chars/<id>.png). The game itself only needs id / name / gender / tag.
// hairStyle: short | long | bun | bob | curly      beard: true = full beard (the original hero)
export const CHARACTERS = [
  { id: 'apoorv', name: 'APOORV', gender: 'M', tag: 'THE CREATOR (REAL ME!)',
    look: { skin: '#e8b890', skinS: '#c98f68', hair: '#1b1512', hairHi: '#3b2c24', beard: true, hairStyle: 'short', glasses: false,
      lips: '#8c3b32', blazer: '#2a2a48', blazerHi: '#4a4a72', lanyard: '#e4002b', pants: '#3a3a58' } },
  { id: 'arjun', name: 'ARJUN', gender: 'M', tag: 'THE SHARP ONE',
    look: { skin: '#d9a066', skinS: '#b97c48', hair: '#14100e', hairHi: '#34281e', beard: false, hairStyle: 'short', glasses: false,
      lips: '#8c3b32', blazer: '#1f3a5f', blazerHi: '#3c64a0', lanyard: '#58b0f8', pants: '#2c3a58' } },
  { id: 'leo', name: 'LEO', gender: 'M', tag: 'THE THINKER',
    look: { skin: '#f1c9a5', skinS: '#d9a07c', hair: '#5a3a22', hairHi: '#8a6040', beard: false, hairStyle: 'curly', glasses: true,
      lips: '#a04a40', blazer: '#4a4a4a', blazerHi: '#7c7c7c', lanyard: '#58d854', pants: '#2c2c3c' } },
  { id: 'kabir', name: 'KABIR', gender: 'M', tag: 'THE CALM ONE',
    look: { skin: '#a86a40', skinS: '#8c5430', hair: '#0f0c0a', hairHi: '#2a2018', beard: false, hairStyle: 'short', glasses: false,
      lips: '#6c2c28', blazer: '#1f4a3a', blazerHi: '#3c8068', lanyard: '#f8d878', pants: '#2c3a34' } },
  { id: 'anaya', name: 'ANAYA', gender: 'F', tag: 'THE BOLD ONE',
    look: { female: true, skirt: true, skin: '#e0a574', skinS: '#bf8250', hair: '#14100e', hairHi: '#3a2c24', beard: false, hairStyle: 'long', glasses: false,
      lips: '#c03050', blazer: '#a02848', blazerHi: '#e05878', lanyard: '#f8d878', pants: '#3a2a3a' } },
  { id: 'meghna', name: 'MEGHNA', gender: 'F', tag: 'THE PLANNER',
    look: { female: true, skirt: true, skin: '#c98f68', skinS: '#a87048', hair: '#2a1a14', hairHi: '#4a3226', beard: false, hairStyle: 'bun', glasses: true,
      lips: '#b03850', blazer: '#00788a', blazerHi: '#38b8c8', lanyard: '#e4002b', pants: '#2a3a48' } },
  { id: 'zoya', name: 'ZOYA', gender: 'F', tag: 'THE CREATIVE',
    look: { female: true, skirt: true, skin: '#f1c9a5', skinS: '#d9a07c', hair: '#8a3a22', hairHi: '#bc6a40', beard: false, hairStyle: 'bob', glasses: false,
      lips: '#d04060', blazer: '#6844fc', blazerHi: '#a888ff', lanyard: '#fcfcfc', pants: '#3a3a5c' } },
  { id: 'nia', name: 'NIA', gender: 'F', tag: 'THE LEADER',
    look: { female: true, skin: '#8c5a3c', skinS: '#6e4228', hair: '#0f0c0a', hairHi: '#2a2018', beard: false, hairStyle: 'curly', glasses: false,
      lips: '#a02840', blazer: '#d08020', blazerHi: '#f8b848', lanyard: '#f83800', pants: '#3a3028' } },
];
export const byGender = (g) => CHARACTERS.filter((c) => c.gender === g);
export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
