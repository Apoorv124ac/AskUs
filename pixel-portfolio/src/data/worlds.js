// One entry per portfolio section. `ready:false` worlds are built on later days.
export const WORLDS = [
  { id: 1, name: 'RECEPTION', topic: 'INTRO / ABOUT ME', color: 0xf83800, ready: true, room: 'world1',
    chapter: 'THE LOBBY', desc: "MEET APOORV'S WORLD. FIND 10 STORY COINS AND GRAB A COFFEE." },
  { id: 2, name: 'TRAINING CAMPUS', topic: 'EDUCATION', color: 0x0058f8, ready: true, room: 'world2',
    chapter: 'THE CAMPUS', desc: 'FOUR STUDIES, FOUR CLASSROOMS. FINISH A TASK IN EACH.' },
  { id: 3, name: 'OFFICE FLOORS', topic: 'EXPERIENCE', color: 0xfca044, ready: true, room: 'floor1',
    chapter: 'THE OFFICE FLOORS', desc: 'FIVE FLOORS, FIVE ROLES. BEAT A BOSS ON EACH FLOOR.',
    roomFor: (save) => `floor${save.floors.findIndex((f) => !f) + 1 || 1}` },
  { id: 4, name: 'SKILL ARCADE', topic: 'SKILLS', color: 0x6844fc, ready: true, room: 'world4',
    chapter: 'THE ARCADE', desc: 'THREE CABINETS, 15 SKILLS. SEE WHERE EACH WAS USED.' },
  { id: 5, name: 'TROPHY HALL', topic: 'AWARDS & CERTIFICATES', color: 0xf8d878, ready: true, room: 'world5',
    chapter: 'THE TROPHY HALL', desc: 'HIT THE ? BLOCKS FROM BELOW. RELEASE 5 CERTIFICATES.' },
  { id: 6, name: "DRAGON'S LAIR", topic: 'FINAL BOSS', color: 0xc82810, ready: true, room: 'dragon',
    chapter: "THE DRAGON'S LAIR", desc: 'THE DEADLINE DRAGON GUARDS THE EXIT. STOMP IT OR THROW ARROWS.' },
  { id: 7, name: 'ROOFTOP', topic: 'CONTACT & CREDITS', color: 0x00a800, ready: true, room: 'world6',
    chapter: 'THE ROOFTOP', desc: 'HOW TO REACH APOORV, THE CAST AND THE CREDITS.' },
];
