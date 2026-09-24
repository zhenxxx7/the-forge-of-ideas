import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

export function storyboardSave() {
  const ids = ['lifelike','setting','uncertainty','reactions','senses','control','pace','contrast'];
  const connections = ['lifelike','setting','senses'].map((main,index) => ({ main, supporting: [['reactions'],['control'],['pace']][index], explanation: 'The supporting detail develops this main idea and helps the reader anticipate danger.' }));
  return { version: 1, name: 'Sean', screen: 'journey', prologueIndex: 0, journeyStage: 1, explored: ['how','moment','tense'], completed: true,
    generate: { step: 'collected', selected: ids, activeIdea: 'lifelike', completed: true, timerPaused: true },
    sort: { step: 'sorting', assignments: { lifelike:'central', setting:'central', senses:'central', reactions:'supporting', control:'supporting', pace:'supporting', uncertainty:'irrelevant', contrast:'irrelevant' }, activeIdea: null, completed: true, timerPaused: true },
    connect: { step:'explain', mainIdea:'lifelike', supportingIdea:null, connections, completed:true, timerPaused:true },
    elaborate: { step:'review', activeMain:'lifelike', infusions: connections.map(c => ({ main:c.main, runes:['evidence','effect'], response:'A precise detail from the classroom extract would develop this connection and explain why the reader anticipates danger.', sourceFingerprint:JSON.stringify([c.main,c.supporting,c.explanation]) })), completed:true, timerPaused:true },
    challenge: { step:'won', selected:null, used:['lifelike','setting'], aim:50, hits:2, confusion:0, lastOutcome:'hit', completed:true },
    ending: { step:'archive', reflection:'', completed:true },
  };
}

const scenes = [
  ['landing', null, null], ['name',null,null], ['intro','prologue',null], ['stage1-question','prepare',null],
  ...[1,2,3,4,5].map(i => [`recap-${i}`,'journey',i]),
  ...['entrance','intro','explore','collected'].map(s => [`stage2-${s}`,'generate',s]),
  ...['intro','sorting'].map(s => [`stage3-${s}`,'sort',s]),
  ...['intro','combine','explain'].map(s => [`stage4-${s}`,'connect',s]),
  ...['intro','choose','develop','review'].map(s => [`stage5-${s}`,'elaborate',s]),
  ...['intro','instructions','aim','won'].map(s => [`stage6-${s}`,'challenge',s]),
  ...['portal','archive'].map(s => [`ending-${s}`,'ending',s]),
];
const width = Number(process.argv[2] || 1440);
const only = process.argv[3] === 'all' ? null : process.argv[3];
const largeText = process.argv[4] === 'large';
const prefix = `${width}${largeText ? '-large' : ''}`;
const viewport = { width, height: width < 600 ? 915 : width < 1000 ? 390 : 900 };
const browser = await chromium.launch();
await mkdir('artifacts/storyboard', { recursive:true });
let failureCount = 0;
try {
  for (const [name,screen,step] of scenes) {
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage({viewport, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror',e => errors.push(e.message));
    const seed = storyboardSave();
    if (screen) seed.screen = screen;
    if (screen === 'journey') seed.journeyStage = step;
    else if (screen && screen in seed) seed[screen].step = step;
    if (screen === 'prepare') seed.explored = [];
    if (screen === 'sort' && step === 'sorting') { seed.sort.assignments = {}; seed.sort.completed = false; }
    if (screen === 'connect' && step === 'combine') { seed.connect.mainIdea = 'lifelike'; seed.connect.supportingIdea = 'reactions'; seed.connect.connections = []; }
    if (screen === 'challenge' && step !== 'won') { seed.challenge.completed=false; seed.challenge.used=[]; seed.challenge.hits=0; seed.challenge.selected = step === 'aim' ? 'lifelike' : null; }
    await page.addInitScript(({seed,screen,largeText}) => {
      localStorage.setItem('forge-of-ideas:settings:v1',JSON.stringify({sound:false,reducedMotion:true,largeText}));
      if(screen) localStorage.setItem('forge-of-ideas:progress:v1',JSON.stringify(seed));
    },{seed,screen,largeText});
    await page.goto('http://127.0.0.1:5173');
    if (screen) await page.getByRole('button',{name:'Continue your journey',exact:true}).click();
    else if(name === 'name') await page.getByRole('button',{name:'Begin the journey',exact:true}).click();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.game-frame').screenshot({path:`artifacts/storyboard/${prefix}-${name}.png`,animations:'disabled'});
    const issues = await page.evaluate(() => {
      const errors = [];
      if(document.documentElement.scrollWidth > innerWidth + 1) errors.push('horizontal page overflow');
      const frame=document.querySelector('.game-frame').getBoundingClientRect();
      for(const el of document.querySelectorAll('.dialogue-copy,.side-tools,.journey-panel,.dialogue-navigation,.dialogue-scroll .gold-button,.scene-navigation')) {
        if(!el.checkVisibility()) continue;
        const r=el.getBoundingClientRect();
        if(r.left < frame.left-2 || r.right > frame.right+2 || r.top < frame.top-2 || r.bottom > frame.bottom+2) errors.push(el.className+' outside frame');
      }
      for (const img of document.querySelectorAll('img')) {
        if (img.checkVisibility() && (!img.complete || !img.naturalWidth)) errors.push('missing image '+img.getAttribute('src'));
      }
      for (const text of document.querySelectorAll('.dialogue-copy')) {
        if (!text.checkVisibility()) continue;
        const r=text.getBoundingClientRect(), paper=text.closest('.dialogue-scroll').getBoundingClientRect();
        if(r.bottom > paper.bottom-12) errors.push('dialogue text exceeds parchment');
      }
      return errors;
    });
    if (issues.length || errors.length) failureCount++;
    console.log(`${width} ${name}: ${[...issues,...errors].join(', ') || 'OK'}`);
    await page.close();
  }
  if(!only) {
    const tiles=await Promise.all(scenes.map(async ([name],index) => ({ input:await sharp(`artifacts/storyboard/${prefix}-${name}.png`).resize(400,225,{fit:'contain',background:'#0b0e13'}).extend({bottom:24,top:0,left:0,right:0,background:'#232323'}).composite([{input:Buffer.from(`<svg width="400" height="24"><text x="8" y="17" font-family="Arial" font-size="12" fill="white">${name}</text></svg>`),top:225,left:0}]).png().toBuffer(),left:index%4*400,top:Math.floor(index/4)*249 })));
    await sharp({create:{width:1600,height:Math.ceil(scenes.length/4)*249,channels:3,background:'#232323'}}).composite(tiles).png().toFile(`artifacts/storyboard/${prefix}-contact.png`);
  }
} finally { await browser.close(); }
if(failureCount) process.exitCode=1;
