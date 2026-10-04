// NPC sprite sheet layout: one row per character, 4 frames per row.
// Replace public/assets/npcs.png with your own art keeping this order/size.
export const NPC_ORDER = ['rita', 'raju', 'meera', 'prof', 'ceo', 'sam', 'ravi', 'curator'];
export const NPC_COLS = 4; // idle0, idle1, talk, wave

export const NPC_ANIMS = (id) => {
  const base = NPC_ORDER.indexOf(id) * NPC_COLS;
  return {
    [`${id}-idle`]: { frames: [base, base, base, base, base + 1, base], fps: 3, repeat: -1 },
    [`${id}-talk`]: { frames: [base + 2, base], fps: 6, repeat: -1 },
    [`${id}-wave`]: { frames: [base + 3, base + 3, base], fps: 4, repeat: -1 },
  };
};
