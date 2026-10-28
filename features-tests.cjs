const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'index.html'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-26T12:00:00-07:00'));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const tapWord=async word=>{for(const c of word)await page.getByRole('button',{name:c,exact:true}).tap();await page.locator('#enter').tap()};
 assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
 await page.locator('#sound').tap();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'C',exact:true}).tap();
 assert.equal(await page.evaluate(()=>audioContext?.state),'running');
 await page.locator('#delete').tap();await page.reload();assert.equal(await page.locator('#sound').textContent(),'Sound on');
 await page.locator('#sound').tap();
 const historySeed=await page.evaluate(()=>{
  const result={};for(const date of ['2026-10-24','2026-10-25']){const p=puzzles[hash(date)%puzzles.length];const w=[...dictionary].find(w=>w.includes(p.center)&&[...w].every(c=>p.letters.includes(c)));result['d'+date]={words:[w]}}
  return result;
 });
 await page.evaluate(records=>localStorage.setItem('word-hive-v3',JSON.stringify(records)),historySeed);await page.reload();
 assert.match(await page.locator('#streak').textContent(),/2-day streak/);
 await tapWord('COIN');assert.match(await page.locator('#streak').textContent(),/3-day streak/);
 await page.locator('#length-hints summary').tap();
 const lengthBefore=await page.locator('[data-length="4"]').getAttribute('aria-label');assert.match(lengthBefore,/4 letters: 1 of/);
 await page.locator('#pairs-toggle').tap();assert.equal(await page.locator('#pairs').isVisible(),true);
 assert.match(await page.locator('#pairs .pair').filter({hasText:'CO'}).getAttribute('aria-label'),/CO: 1 of/);
 await tapWord('CONE');assert.match(await page.locator('[data-length="4"]').getAttribute('aria-label'),/4 letters: 2 of/);
 await page.locator('#reveal').tap();assert.equal(await page.locator('#assisted').isVisible(),false);assert.equal(await page.locator('#answers').textContent(),'');
 await page.locator('#cancel-reveal').tap();assert.equal(await page.locator('#reveal').textContent(),'Reveal remaining');
 const bestBefore=await page.locator('#stats').textContent();
 await page.locator('#reveal').tap();await page.locator('#reveal').tap();
 assert.equal(await page.locator('#assisted').isVisible(),true);assert.equal(await page.locator('#score').textContent(),'2 pts');
 assert.equal(await page.locator('#answers .word-definition').count(),79);
 assert.match(await page.locator('#streak').textContent(),/2-day streak/);
 await tapWord('COEFFICIENT');assert.equal(await page.locator('#score').textContent(),'20 pts');
 assert.ok(!(await page.locator('#stats').textContent()).includes('Best: 20 points'));
 await page.evaluate(()=>{window.__shared='';Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data.text}})});
 await page.locator('#share').tap();assert.match(await page.evaluate(()=>window.__shared),/Assisted · answers revealed/);
 await page.reload();assert.equal(await page.locator('#assisted').isVisible(),true);assert.equal(await page.locator('#score').textContent(),'20 pts');
 await page.locator('#new').tap();assert.equal(await page.locator('#assisted').isVisible(),false);
 const firstPractice=await page.evaluate(()=>index);const practiceWord=await page.evaluate(()=>[...valid][0]);await tapWord(practiceWord);
 assert.match(await page.locator('#streak').textContent(),/2-day streak/);
 await page.locator('#next').tap();assert.equal(await page.evaluate(()=>index),(firstPractice+1)%45);
 await page.locator('#daily').tap();assert.equal(await page.locator('#score').textContent(),'20 pts');
 // Hold Delete clears; cancelling a hold never clears later.
 for(const c of 'FINE')await page.getByRole('button',{name:c,exact:true}).tap();
 await page.locator('#delete').dispatchEvent('pointerdown',{button:0});await page.waitForTimeout(520);await page.locator('#delete').dispatchEvent('pointerup');await page.locator('#delete').click();
 assert.equal(await page.locator('#entry').textContent(),'Tap letters to begin');
 await page.getByRole('button',{name:'N',exact:true}).tap();await page.locator('#delete').dispatchEvent('pointerdown',{button:0});await page.locator('#delete').dispatchEvent('pointercancel');await page.waitForTimeout(520);assert.equal(await page.locator('#entry').textContent(),'N');
 // Midnight guard, even before the interval gets a chance to run.
 const before=await page.evaluate(()=>localStorage.getItem('word-hive-v3'));
 const rollover=await page.evaluate(()=>{entry='FINE';const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-27T00:00:01-07:00']))}};submit();return{day:dailyId,score,words:[...found],entry}});
 assert.deepEqual(rollover,{day:'2026-10-27',score:0,words:[],entry:''});assert.equal(await page.evaluate(()=>localStorage.getItem('word-hive-v3')),before);
 await page.clock.setFixedTime(new Date('2026-10-29T12:00:00-07:00'));await page.reload();assert.match(await page.locator('#streak').textContent(),/Start your streak/);
 const word=await page.evaluate(()=>[...valid][0]);await tapWord(word);assert.match(await page.locator('#streak').textContent(),/1-day streak/);
 // Revealed answers stay inside every mobile layout, including long pangrams.
 for(const width of [320,390,430,1024]){await page.setViewportSize({width,height:844});await page.locator('#reveal').tap();if(await page.locator('#cancel-reveal').isVisible())await page.locator('#reveal').tap();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}`);if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`features-${width}.png`),fullPage:true})}await page.locator('#new').tap();await page.locator('#next').tap()}
 assert.deepEqual(errors,[]);await ctx.close();
 console.log('Feature tests passed: saved progress, sound and preference persistence, word-length/pair hints, reveal confirmation and assisted scoring, daily streaks and gaps, practice isolation, hold-to-clear/cancellation, sharing, synchronous midnight guard, and expanded mobile/desktop layouts.');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
