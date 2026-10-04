// One entry per portfolio section. `ready:false` worlds are built on later days.
export const WORLDS = [
  { id: 1, name: 'RECEPTION', topic: 'INTRO / ABOUT ME', color: 0xf83800, ready: true, room: 'world1',
    chapter: 'THE LOBBY', desc: 'THE STORY STARTS HERE. FIND 10 FACT COINS, MEET THE TEAM, GRAB A COFFEE.' },
  { id: 2, name: 'TRAINING CAMPUS', topic: 'EDUCATION', color: 0x0058f8, ready: true, room: 'world2',
    chapter: 'THE CAMPUS', desc: 'FOUR DEGREES, FOUR CLASSROOMS. FINISH A TASK IN EACH TO EARN THE SCROLL.' },
  { id: 3, name: 'OFFICE FLOORS', topic: 'EXPERIENCE', color: 0xfca044, ready: true, room: 'floor1',
    chapter: 'THE OFFICE FLOORS', desc: 'FIVE FLOORS, FIVE ROLES. BEAT A BOSS ON EACH ONE AND TAKE THE ELEVATOR UP.',
    roomFor: (save) => `floor${save.floors.findIndex((f) => !f) + 1 || 1}` },
  { id: 4, name: 'SKILL ARCADE', topic: 'SKILLS', color: 0x6844fc, ready: true, room: 'world4',
    chapter: 'THE ARCADE', desc: 'THREE CABINETS, FIFTEEN SKILL COINS. SEE WHERE EACH ONE WAS USED.' },
  { id: 5, name: 'TROPHY HALL', topic: 'AWARDS & CERTIFICATES', color: 0xf8d878, ready: false, day: 8,
    desc: 'HIT THE ? BLOCKS TO REVEAL CERTIFICATES.' },
  { id: 6, name: 'ROOFTOP', topic: 'CONTACT & CREDITS', color: 0x00a800, ready: false, day: 8,
    desc: 'SUNSET, LINKS, RESUME DOWNLOAD AND CREDITS.' },
];
