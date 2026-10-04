// World 4 "Skill Arcade": 15 skill coins in 3 cabinets. Each coin shows where the skill was used.
// Bars at the top fill as you find them (they count what you've FOUND, not a rating).
import { LEVELS } from '../levels.js';
import resume from '../data/resume.json';
import { burst } from '../ui/pixel.js';

export const CATS = resume.skillArcade;
const CAT_CHAR = { u: 0, v: 1, w: 2 };
const ROOMS = ['world4', 'arc1', 'arc2', 'arc3']; // main hall first, then the secret pipe rooms

// every coin of one cabinet, in a fixed order (so "skill 1" is always the same one)
export function skillEntries(cat) {
  const out = [];
  ROOMS.forEach((key) => {
    const L = LEVELS[key];
    const cols = [];
    for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) if (CAT_CHAR[L.grid[r][c]] === cat) cols.push({ room: key, col: c, row: r, id: `${key}:${c},${r}` });
    cols.sort((a, b) => a.col - b.col);
    out.push(...cols);
  });
  return out.map((e, i) => ({ ...e, idx: i }));
}
export const ENTRIES = CATS.map((_, i) => skillEntries(i));
export const TOTAL = ENTRIES.reduce((n, e) => n + e.length, 0);

export function skillBars(collected) {
  return CATS.map((c, i) => [ENTRIES[i].filter((e) => collected.has(e.id)).length, ENTRIES[i].length, c.tint, c.short]);
}
export const countSkills = (collected) => skillBars(collected).reduce((n, b) => n + b[0], 0);

export class ArcadeSkills {
  constructor(scene) {
    this.s = scene;
    this.group = scene.physics.add.staticGroup();
    const L = scene.level;
    for (let r = 0; r < L.h; r++)
      for (let c = 0; c < L.w; c++) {
        const cat = CAT_CHAR[L.grid[r][c]];
        if (cat === undefined) continue;
        const id = `${L.room}:${c},${r}`;
        if (scene.collected.has(id)) continue;
        const e = ENTRIES[cat].find((x) => x.id === id);
        const it = this.group.create(c * 16 + 8, r * 16 + 8, 'coin', 0).setDepth(4).setTint(CATS[cat].tint).setScale(1.25);
        it.setSize(12, 14);
        it.itemId = id;
        it.cat = cat;
        it.idx = e.idx;
        it.anims.play('coin-spin');
        it.anims.setProgress((c % 4) / 4);
        scene.tweens.add({ targets: it, y: it.y - 2, yoyo: true, repeat: -1, duration: 650, delay: c * 30 });
      }
    scene.physics.add.overlap(scene.player, this.group, (_, it) => this.collect(it));
    this.publish();
  }

  publish() {
    const reg = this.s.registry;
    reg.set('skillBars', skillBars(this.s.collected));
    reg.set('hudInfo', `SKILLS ${countSkills(this.s.collected)}/${TOTAL}`);
  }

  collect(it) {
    const { s } = this;
    s.collected.add(it.itemId);
    const cat = CATS[it.cat];
    const skill = cat.skills[it.idx] || { name: 'SKILL', proof: '' };
    burst(s, it.x, it.y, { n: 12, colors: [cat.tint, 0xfcfcfc, 0xf8d878] });
    s.popText(it.x, it.y - 8, '+SKILL');
    const n = countSkills(s.collected);
    s.game.events.emit('fact', {
      icon: 'coin',
      title: `SKILL ${n}/${TOTAL}`,
      label: skill.name,
      tag: `CAB${it.cat + 1}`,
      text: skill.proof,
    });
    it.destroy();
    s.award();
    this.publish();
    if (n === TOTAL) s.time.delayedCall(900, () => s.game.events.emit('banner', 'ALL 15 SKILLS!\nTHE ARCADE IS CLEARED'));
    else if (skillBars(s.collected)[it.cat][0] === ENTRIES[it.cat].length)
      s.time.delayedCall(900, () => s.game.events.emit('banner', `CABINET ${it.cat + 1} CLEARED!\n${cat.name}`));
  }
}
