// All the words of the Pocket Edition. Short lines; one idea per pop-up. *Stars* highlight a word.
// Facts come from Apoorv's resume.
import resume from '../data/resume.json';

export const STAGES = [
  { id: 1, name: 'OVERVIEW', short: 'INTRO', topic: 'MEET APOORV', room: 'pk1', color: 0xf83800, blurb: 'LEARN THE MOVES. MEET APOORV.' },
  { id: 2, name: 'EDUCATION & WORK', short: 'STUDY', topic: 'STUDIES AND JOBS', room: 'pk2', color: 0x0058f8, blurb: '4 DEGREES. 5 OFFICES.' },
  { id: 3, name: 'SKILLS', short: 'SKILLS', topic: 'UNDERWATER', room: 'pk3', color: 0x00a8a8, blurb: 'DIVE IN. BEAT THE FISH DRAGON.' },
  { id: 4, name: 'SOFTWARE SKILLS', short: 'TOOLS', topic: 'IN THE AIR', scene: 'Plane', color: 0x6844fc, blurb: 'FLY. SHOOT DESIGN ARROWS.' },
  { id: 5, name: 'LINKS', short: 'LINKS', topic: 'LET\'S TALK', room: 'pk5', color: 0x00a800, blurb: 'COLLECT STARS. SAY HELLO.' },
];

export const OVERVIEW_CARDS = [
  { tag: '12+', label: 'YEARS', text: '*12+ YEARS* OF DESIGN. THIS GAME IS HOW I TELL THE STORY.' },
  { tag: 'WSP', label: 'NOW', text: 'SPECIALIST GRAPHIC DESIGNER AT *WSP*, SINCE AUG 2024.' },
  { tag: 'STYLE', label: 'MY WAY', text: 'I TURN *COMPLEX IDEAS* INTO CLEAR VISUAL STORIES.' },
  { tag: 'TEAMS', label: 'LEAD', text: 'I LEAD DESIGN TEAMS AND KEEP BRANDS *CONSISTENT*.' },
];

const exp = [...resume.experience].reverse(); // freelance, Bhoomi, Deloitte, JLL, WSP
export const EXPERIENCE_CARDS = [
  { tag: '2013', label: 'FREELANCE', text: 'FREELANCE FOR *BHOOMI, VIBAANTA, GLOBAL EDUCATION* AND *13JUGAAD.COM*.' },
  { tag: '2016', label: 'BHOOMI', text: 'AT *BHOOMI*: BRANDING, LEARNING MATERIAL, WEB GRAPHICS AND SOCIAL CONTENT.' },
  { tag: '2021', label: 'DELOITTE DIGITAL', text: 'AT *DELOITTE DIGITAL*: NEWSPAPER AD CAMPAIGNS FOR THE US, UK AND AUSTRALIA.' },
  { tag: '2022', label: 'JLL', text: 'AT *JLL*: LED A DESIGN TEAM. KEPT ONE BRAND CONSISTENT ACROSS US MARKETS.' },
  { tag: '2024', label: 'WSP', text: 'AT *WSP*: PRESENTATIONS FOR GLOBAL LEADERSHIP, INCLUDING THE CEO TEAM.' },
].map((c, i) => ({ ...c, dates: exp[i].dates }));

// the four studies, in order (BSc, MA, IIT Delhi, IIT Guwahati)
export const STUDIES = [...resume.education].reverse().map((e) => ({ short: e.short, years: e.years, story: e.story, school: e.school }));

export const SKILLS = [
  { name: 'BRAND IDENTITY', text: 'ONE BRAND, MANY MARKETS. KEPT CONSISTENT AT *JLL*.' },
  { name: 'TEAM LEADERSHIP', text: 'LED A DESIGN TEAM AT *JLL*, 2022 TO 2024.' },
  { name: 'STAKEHOLDERS', text: 'WORKS WITH *COPYWRITERS, CREATIVE DIRECTORS* AND CROSS-FUNCTIONAL TEAMS.' },
  { name: 'EXECUTIVE DECKS', text: 'PRESENTATIONS FOR *GLOBAL LEADERSHIP* AND THE CEO TEAM AT WSP.' },
  { name: 'CAMPAIGN DESIGN', text: '*NEWSPAPER CAMPAIGNS* AND MARKETING MATERIAL THAT BUILD VISIBILITY.' },
  { name: 'VISUAL STORYTELLING', text: 'COMPLEX IDEAS BECOME *CLEAR, COMPELLING* VISUAL STORIES.' },
  { name: 'TYPOGRAPHY & LAYOUT', text: 'FROM *CONCEPT TO FINAL LAYOUT*: BRANDING, LEARNING MATERIAL, WEB GRAPHICS.' },
  { name: 'DATA VISUALIZATION', text: 'MAKING DATA *EASY TO SEE*. DATA SCIENCE CERTIFICATE, IIT GUWAHATI.' },
  { name: 'INTERFACE DESIGN', text: '*ADOBE XD: DESIGN & PROTOTYPE* CERTIFIED (LINKEDIN, 2022).' },
];

export const TOOLS = [
  { name: 'ADOBE INDESIGN', text: 'MY GO-TO FOR *LAYOUTS*: DECKS, COLLATERAL AND PRINT.', color: 0xe8408a },
  { name: 'ILLUSTRATOR', text: '*LOGOS AND ILLUSTRATIONS*. CERTIFIED (LINKEDIN, 2022).', color: 0xfca044 },
  { name: 'PHOTOSHOP', text: '*IMAGE EDITING* AND VISUAL ASSETS, EVERY DAY.', color: 0x58b0f8 },
  { name: 'AFTER EFFECTS', text: 'WHEN A DESIGN NEEDS TO *MOVE*.', color: 0xa888ff },
  { name: 'ADOBE XD', text: '*DESIGN AND PROTOTYPE* INTERFACES.', color: 0xff6adf },
  { name: 'POWERPOINT', text: '*VISUAL STORYTELLING IN POWERPOINT*. CERTIFIED (LINKEDIN, 2022).', color: 0xf87858 },
];

// NPC and sign dialogue, merged into the main dialogue table when the Pocket Edition starts
export const DIALOGUE = {
  pk1Rita: {
    name: 'RITA', role: 'GUIDE', color: '#58d8d8',
    lines: [
      "WELCOME, *{name}*! I'M RITA. THIS IS A QUICK TOUR OF *APOORV'S* WORK.",
      '*◀ ▶* WALK. *JUMP* JUMPS. TAP JUMP AGAIN IN THE AIR FOR A *DOUBLE JUMP*. HOLD *RUN* TO GO FAST.',
      '*RUN + JUMP* IS A *LONG JUMP*. PRESS *▼* ON A GREEN PIPE TO GO INSIDE.',
      'GRAB THE COINS. *CLEAR EACH STAGE* TO UNLOCK ONE OF HIS *PROJECTS*.',
    ],
    again: ['COINS TELL HIS STORY. THE FLAG IS AT THE END.'],
  },
  pk1End: {
    name: 'MEERA', role: 'MANAGER', color: '#f8a0d8',
    lines: [
      'THIS IS *APOORV CHAURASIA*. SPECIALIST, GRAPHICS DESIGN AT WSP, LUCKNOW.',
      'HE HAS DESIGNED FOR *12+ YEARS* ACROSS WSP, JLL, DELOITTE DIGITAL AND BHOOMI.',
      'HIS STYLE: *BRAND THINKING*, *CLEAR COMMUNICATION* AND *CREATIVE LEADERSHIP*.',
      'CLEAR THIS STAGE TO OPEN HIS *FIRST PROJECT*.',
    ],
    again: ['THE DOOR IS RIGHT THERE, {name}.'],
  },
  pk2Prof: {
    name: 'PROF. DAS', role: 'STUDIES', color: '#d8a870',
    lines: [
      'WELCOME TO CAMPUS! ENTER EACH *PIPE* AND WIN THE *MINI-GAME*. EACH WIN EARNS ONE *DEGREE*.',
      'THEN WALK ON. EACH *DOORWAY* LEADS INTO A NEW *OFFICE*. YOU NEED ALL *4 DEGREES* TO FINISH.',
    ],
    again: ['FOUR PIPES, {name}. FOUR DEGREES.'],
  },
  pk2Sam: {
    name: 'SAM', role: 'WORK', color: '#bcbcbc',
    lines: [
      'THIS DOOR LEADS TO *FIVE OFFICES*, FROM 2013 TO TODAY.',
      'EACH DOORWAY IS A *NEW JOB*. STEP THROUGH TO SEE WHAT APOORV DID THERE.',
    ],
    again: ['FIVE OFFICES, {name}. GO ON IN.'],
  },
  pk3Intro: {
    name: 'RAVI', role: 'DIVE GUIDE', color: '#a888ff',
    lines: [
      'WELCOME UNDERWATER, *{name}*! EVERYTHING MOVES SLOWLY HERE.',
      'HOLD *JUMP* TO SWIM UP. HOLD *▼* TO SINK. TAP *THROW* TO FIRE *DESIGN ARROWS*.',
      'BEAT THE *FISH* TO REVEAL APOORV\'S *SKILLS*. THEN FACE THE *FISH DRAGON*.',
    ],
    again: ['THROW ARROWS AT THE FISH, {name}.'],
  },
  pk4Intro: {
    name: 'CAPTAIN', role: 'PILOT', color: '#f8d878',
    lines: [],
  },
  pk5Intro: {
    name: 'RITA', role: 'FINISH LINE', color: '#58d8d8',
    lines: [
      'LAST STAGE, *{name}*! HOP ACROSS AND COLLECT THE *STARS*.',
      'THE SIGNS SHOW *HOW TO REACH APOORV*. THEN RAISE THE FLAG.',
    ],
    again: ['SIGNS FIRST, THEN THE FLAG, {name}.'],
  },
};

export const PROJECTS = [
  { title: 'BRAND SYSTEM', client: 'SAMPLE · LOGO, COLOUR AND TYPE', pages: ['COVER', 'LOGO AND GRID', 'COLOUR AND TYPE', 'IN USE'], seed: 11, palette: ['#e4002b', '#14262b', '#f8d878', '#58b0f8'] },
  { title: 'EXECUTIVE DECK', client: 'SAMPLE · LEADERSHIP PRESENTATION', pages: ['TITLE', 'THE STORY', 'THE NUMBERS', 'NEXT STEPS'], seed: 23, palette: ['#0058f8', '#fcfcfc', '#fca044', '#1c2250'] },
  { title: 'NEWSPAPER CAMPAIGN', client: 'SAMPLE · PRINT AD SERIES', pages: ['HERO AD', 'HEADLINES', 'LAYOUT GRID', 'VARIATIONS'], seed: 37, palette: ['#f83800', '#fcfcfc', '#0f0f1b', '#f8d878'] },
  { title: 'DATA STORY', client: 'SAMPLE · INFOGRAPHIC', pages: ['OVERVIEW', 'THE CHART', 'KEY FINDINGS', 'SUMMARY'], seed: 41, palette: ['#00a8a8', '#fcfcfc', '#6844fc', '#14262b'] },
  { title: 'APP INTERFACE', client: 'SAMPLE · SCREENS AND PROTOTYPE', pages: ['HOME', 'FLOW', 'COMPONENTS', 'PROTOTYPE'], seed: 53, palette: ['#58d854', '#14262b', '#ff6adf', '#fcfcfc'] },
];
