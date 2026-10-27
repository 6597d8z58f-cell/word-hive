const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Run against the local file by default, or BASE_URL for a deployed build.
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.BASE_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:3, timezoneId:'America/Los_Angeles' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-26T19:00:00-07:00'));
    await page.goto(url);
    await page.locator('#goal').waitFor();
    const state = () => page.evaluate(() => ({index, mode, center, letters, score, words:[...found], valid:[...valid], dailyId}));
    const tapWord = async word => {for(const letter of word) await page.getByRole('button',{name:letter,exact:true}).tap(); await page.locator('#enter').tap();};
    const message = () => page.locator('#msg').textContent();
    const initial = await state();
    assert.equal(initial.dailyId,'2026-10-26');
    for(const letter of initial.letters) await page.getByRole('button',{name:letter,exact:true}).tap();
    assert.equal(await page.locator('#entry').textContent(),initial.letters.join(''));
    for(let i=0;i<7;i++) await page.locator('#delete').tap();
    assert.equal(await page.locator('#entry').textContent(),'Tap letters to begin');
    await page.locator('#shuffle').tap();
    assert.equal(await page.locator('.center').textContent(),initial.center);
    assert.deepEqual((await page.locator('.hex').allTextContents()).sort(),initial.letters.sort());
    results.push('Touch letter buttons, delete, shuffle and fixed center');
    await tapWord(initial.center.repeat(3));
    assert.match(await message(),/Too short/);
    await tapWord(initial.letters.find(c=>c!==initial.center).repeat(4));
    assert.match(await message(),/Missing the center/);
    await tapWord(initial.center.repeat(5));
    assert.match(await message(),/Not in this puzzle/);
    assert.equal((await state()).score,0);
    const four=initial.valid.find(w=>w.length===4);
    const longer=initial.valid.find(w=>w.length>4 && new Set(w).size<7);
    const pangram=initial.valid.find(w=>new Set(w).size===7);
    assert.ok(four && longer && pangram);
    await tapWord(four);
    assert.equal((await state()).score,1);
    assert.equal(await page.locator('.particle').count(),9);
    assert.equal(await page.locator('.burst').evaluate(e=>getComputedStyle(e).animationName),'pop');
    await tapWord(four);
    assert.match(await message(),/Already found/);
    assert.equal((await state()).score,1);
    await tapWord(longer);
    assert.equal((await state()).score,1+longer.length);
    await tapWord(pangram);
    const expected=1+longer.length+pangram.length+7;
    assert.equal((await state()).score,expected);
    assert.equal(await page.locator('.particle').count(),18);
    assert.match(await page.locator('.burst').textContent(),/PANGRAM/);
    results.push('Dictionary rejection, center requirement, duplicates, 4-letter/long-word/pangram scoring and animation CSS');
    if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'mobile-pangram.png'),fullPage:true});}
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('#flash').textContent(),'');
    await page.reload();
    assert.equal((await state()).score,expected);
    await page.locator('#new').tap();
    const practice=await state();
    assert.equal(practice.mode,'practice');
    const practiceWord=practice.valid[0];
    await tapWord(practiceWord);
    const practiceScore=(await state()).score;
    await page.locator('#daily').tap();
    assert.equal((await state()).score,expected);
    await page.locator('#new').tap();
    assert.equal((await state()).score,practiceScore);
    await page.locator('#daily').tap();
    await page.clock.setFixedTime(new Date('2026-10-27T00:00:01-07:00'));
    await page.waitForTimeout(1100);
    assert.equal((await state()).dailyId,'2026-10-27');
    assert.equal((await state()).score,0);
    await page.clock.setFixedTime(new Date('2026-10-26T19:00:00-07:00'));
    await page.reload();
    assert.equal((await state()).score,expected);
    results.push('Daily determinism, local-midnight rollover, reload persistence and separate practice progress');
    const audit=await page.evaluate(()=>puzzles.map((p,i)=>{
      const words=[...dictionary].filter(w=>w.length>=4&&w.includes(p.center)&&[...w].every(c=>p.letters.includes(c)));
      return {i,letters:new Set(p.letters).size,center:p.letters.includes(p.center),words:words.length,pangrams:words.filter(w=>new Set(w).size===7).length};
    }));
    assert.equal(audit.length,45);
    assert.ok(audit.every(p=>p.letters===7&&p.center&&p.words>0&&p.pangrams>0));
    await page.evaluate(()=>{found=new Set(valid);score=[...valid].reduce((n,w)=>n+(w.length===4?1:w.length)+(new Set(w).size===7?7:0),0);render();});
    assert.match(await page.locator('#rank').textContent(),/Queen Bee/);
    await page.locator('#hint').tap();
    assert.equal(await message(),'All words found!');
    results.push('All 45 puzzles contain a pangram; completion reaches Queen Bee');
    await page.evaluate(()=>localStorage.setItem('word-hive-v3',JSON.stringify({'d2026-10-26':{words:['INVALID',null,42]},'d2026-10-25':null,p2:{words:'bad'}})));
    await page.reload();
    assert.equal((await state()).score,0);
    assert.deepEqual(errors,[]);
    results.push('Malformed saved records recover without page errors');
    await page.emulateMedia({reducedMotion:'reduce'});
    await tapWord(four);
    assert.equal(await page.locator('.burst').evaluate(e=>getComputedStyle(e).animationDuration),'1e-05s');
    results.push('Reduced-motion preference');
    await context.close();
    for(const [width,height] of [[320,568],[375,667],[390,844],[412,915],[844,390]]){
      const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
      const p=await ctx.newPage();await p.goto(url);await p.locator('#goal').waitFor();
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
      const boxes=await p.locator('.hex').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
      assert.ok(boxes.every(b=>b.width>=44&&b.height>=44));
      await p.locator('.center').tap();
      assert.equal(await p.locator('#entry').textContent(),await p.locator('.center').textContent());
      if(process.env.SCREENSHOT_DIR) await p.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`mobile-${width}.png`),fullPage:true});
      await ctx.close();
    }
    results.push('320, 375, 390, 412 and landscape 844 px layouts: no horizontal overflow; touch targets >=44 px');
    const blocked=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})});
    const bp=await blocked.newPage();await bp.goto(url);
    assert.match(await bp.locator('#msg').textContent(),/cannot be saved/);
    await bp.locator('.center').tap();
    assert.equal((await bp.locator('#entry').textContent()).length,1);
    await blocked.close();results.push('Storage-disabled browser remains playable and shows warning');
    console.log(JSON.stringify({url,browser:await browser.version(),results},null,2));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1)});
