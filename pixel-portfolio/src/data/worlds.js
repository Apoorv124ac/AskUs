import { OWNER_NAME } from '../config.js';

// One entry per portfolio section. `ready:false` worlds are built on later days.
export const WORLDS = [
  { id: 1, name: 'RECEPTION', topic: 'INTRO / ABOUT ME', color: 0xf83800, ready: true, room: 'main',
    desc: `MEET ${OWNER_NAME}. COLLECT COINS AND GRAB COFFEE.` },
  { id: 2, name: 'TRAINING CAMPUS', topic: 'EDUCATION', color: 0x0058f8, ready: false, day: 5,
    desc: 'ONE TASK PER DEGREE. COMPLETE IT TO EARN THE SCROLL.' },
  { id: 3, name: 'OFFICE FLOORS', topic: 'EXPERIENCE', color: 0xfca044, ready: false, day: 6,
    desc: 'CLIMB THE FLOORS. ONE BOSS FIGHT PER JOB.' },
  { id: 4, name: 'SKILL ARCADE', topic: 'SKILLS', color: 0x6844fc, ready: false, day: 7,
    desc: 'COLLECT SKILL COINS AND WATCH THE BARS FILL UP.' },
  { id: 5, name: 'TROPHY HALL', topic: 'AWARDS & CERTIFICATES', color: 0xf8d878, ready: false, day: 8,
    desc: 'HIT THE ? BLOCKS TO REVEAL CERTIFICATES.' },
  { id: 6, name: 'ROOFTOP', topic: 'CONTACT & CREDITS', color: 0x00a800, ready: false, day: 8,
    desc: 'SUNSET, LINKS, RESUME DOWNLOAD AND CREDITS.' },
];
