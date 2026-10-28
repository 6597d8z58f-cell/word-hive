const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'index.html'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));let requests=0,networkMode='success';
 await p.route('https://api.dictionaryapi.dev/**',async route=>{requests++;if(networkMode==='offline')return route.abort();if(networkMode==='missing')return route.fulfill({status:404,contentType:'application/json',body:'{}'});return route.fulfill({contentType:'application/json',body:JSON.stringify([{word:'tree',meanings:[{partOfSpeech:'noun',definitions:[{definition:'A woody plant with a trunk and branches.',example:'The tree provides shade.'}]}],license:{name:'CC BY-SA 3.0',url:'https://creativecommons.org/licenses/by-sa/3.0'},sourceUrls:['https://en.wiktionary.org/wiki/tree']}])})});
 await p.clock.setFixedTime(new Date('2026-10-27T12:00:00-07:00'));await p.goto(`http://127.0.0.1:${server.address().port}/`);
 const tapWord=async word=>{for(const c of word)await p.getByRole('button',{name:c,exact:true}).tap();await p.locator('#enter').tap()};
 assert.ok(await p.locator('.hex').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=38));assert.equal(requests,0);
 await tapWord('TREE');
 const panel=p.locator('.words-panel'),panelHeading=panel.locator(':scope > summary');
 await panelHeading.tap();assert.equal(await p.locator('#found').isVisible(),false);assert.match(await panelHeading.textContent(),/Found words 1/);
 for(const selector of ['#length-hints summary','#pairs-toggle','#hint','#reveal'])assert.equal(await p.locator(selector).isVisible(),true);
 await p.locator('#pairs-toggle').tap();assert.equal(await p.locator('#pairs').isVisible(),true);await p.locator('#pairs-toggle').tap();
 await panelHeading.tap();assert.equal(await p.locator('#found').isVisible(),true);assert.equal(await p.locator('#score').textContent(),'1 pts');
 assert.equal(await p.getByRole('button',{name:'Shuffle letters',exact:true}).textContent(),'');
 assert.ok(await p.locator('#found .word-definition').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=26.4));
 await p.getByRole('button',{name:'Definition of tree',exact:true}).tap();
 await p.getByText(/A woody plant with a trunk and branches/).waitFor();assert.equal(await p.locator('#definition-dialog').isVisible(),true);assert.match(await p.locator('#definition-credit').textContent(),/CC BY-SA/);assert.equal(await p.locator('#score').textContent(),'1 pts');
 await p.keyboard.press('T');assert.equal(await p.locator('#entry').textContent(),'Tap letters to begin');await p.keyboard.press('Escape');assert.equal(await p.locator('#definition-dialog').isVisible(),false);
 await p.getByRole('button',{name:'Definition of tree',exact:true}).tap();assert.equal(requests,1);await p.locator('#definition-close').tap();
 await tapWord('TIER');networkMode='offline';await p.getByRole('button',{name:'Definition of tier',exact:true}).tap();await p.getByText(/The definition could not be loaded/).waitFor();assert.equal(await p.locator('#definition-retry').isVisible(),true);
 networkMode='missing';await p.locator('#definition-retry').tap();await p.getByText(/No definition was found/).waitFor();assert.equal(await p.locator('#definition-retry').isVisible(),false);assert.match(await p.locator('#definition-more').getAttribute('href'),/tier#English/);await p.locator('#definition-close').tap();
 // Calendar archive retains dates, progress and assistance independently of today's puzzle.
 await p.locator('#calendar').tap();assert.equal(await p.locator('#calendar-dialog').isVisible(),true);
 assert.equal(await p.locator('[data-date="2026-10-28"]').isDisabled(),true);assert.equal(await p.locator('[data-date="2026-10-25"]').isDisabled(),true);assert.equal(await p.locator('#calendar-prev').isDisabled(),true);
 assert.match(await p.locator('[data-date="2026-10-27"]').getAttribute('aria-label'),/2 words, 2 points/);
 await p.locator('[data-date="2026-10-26"]').tap();assert.match(await p.locator('#daily-label').textContent(),/Archive puzzle · 2026-10-26/);await tapWord('COIN');assert.equal(await p.locator('#score').textContent(),'1 pts');
 assert.match(await p.locator('#streak').textContent(),/1-day streak/);assert.equal(await p.evaluate(()=>history['d2026-10-26'].playedLate),true);
 await p.locator('#back-today').tap();assert.equal(await p.locator('#score').textContent(),'2 pts');
 await p.locator('#calendar').tap();assert.match(await p.locator('[data-date="2026-10-26"]').getAttribute('aria-label'),/1 words, 1 points/);await p.locator('[data-date="2026-10-26"]').tap();
 await p.locator('#reveal').tap();await p.locator('#reveal').tap();
 const beforeLookup=await p.evaluate(()=>({score,words:[...found],assisted}));networkMode='success';
 const revealed=p.locator('#answers .word-definition').first();const revealedLabel=await revealed.getAttribute('aria-label');
 assert.ok(await revealed.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=26.4));await revealed.tap();
 await p.getByText(/A woody plant with a trunk and branches/).waitFor();assert.equal(await p.locator('#definition-title').textContent(),revealedLabel.replace('Definition of ',''));
 assert.deepEqual(await p.evaluate(()=>({score,words:[...found],assisted})),beforeLookup);await p.locator('#definition-close').tap();
 await panelHeading.tap();assert.equal(await p.locator('#answers').isVisible(),true);await panelHeading.tap();assert.equal(await p.locator('#answers').isVisible(),true);
 await p.locator('#calendar').tap();assert.match(await p.locator('[data-date="2026-10-26"]').getAttribute('aria-label'),/assisted/);await p.locator('#calendar-close').tap();await p.reload();assert.equal(await p.evaluate(()=>history['d2026-10-26'].assisted),true);
 await p.clock.setFixedTime(new Date('2026-11-02T12:00:00-08:00'));await p.reload();await p.locator('#calendar').tap();assert.match(await p.locator('#calendar-month').textContent(),/November/);await p.locator('#calendar-prev').tap();assert.match(await p.locator('#calendar-month').textContent(),/October/);assert.equal(await p.locator('#calendar-prev').isDisabled(),true);await p.locator('[data-date="2026-10-27"]').tap();assert.equal(await p.locator('#score').textContent(),'2 pts');
 await p.clock.setFixedTime(new Date('2026-11-03T00:00:01-08:00'));await p.waitForTimeout(1100);assert.match(await p.locator('#daily-label').textContent(),/Archive puzzle · 2026-10-27/);await p.locator('#back-today').tap();assert.match(await p.locator('#daily-label').textContent(),/Daily puzzle · 2026-11-03/);
 // Threshold celebrations occur on earning, not on restoration or duplicate entries.
 await p.clock.setFixedTime(new Date('2026-10-26T12:00:00-07:00'));await p.evaluate(()=>localStorage.removeItem('word-hive-v3'));await p.reload();
 await tapWord('COEFFICIENT');assert.equal(await p.locator('#milestone-toast').getAttribute('data-kind'),'pangram');assert.equal(await p.locator('#milestone-title').textContent(),'First pangram!');assert.match(await p.locator('#milestone-badges').textContent(),/Pangram/);await p.locator('#milestone-close').tap();
 await tapWord('COEFFICIENT');assert.equal(await p.locator('#milestone-toast').isVisible(),false);await p.reload();assert.equal(await p.locator('#milestone-toast').isVisible(),false);assert.match(await p.locator('#milestone-badges').textContent(),/Pangram/);
 // Construct a legitimate saved near-Genius position, then earn the final points through letter taps.
 const finishingWord=await p.evaluate(()=>{const words=[...valid],threshold=Math.ceil(puzzleInfo(index).max*.7);let sum=0,chosen=[];for(const w of words){if(sum+points(w)>=threshold){found=new Set(chosen);score=sum;persist();render();return w}chosen.push(w);sum+=points(w)}});
 await tapWord(finishingWord);assert.equal(await p.locator('#milestone-toast').getAttribute('data-kind'),'genius');assert.match(await p.locator('#milestone-title').textContent(),/Genius/);await p.locator('#milestone-close').tap();
 const lastWord=await p.evaluate(()=>{const last=[...valid].at(-1);found=new Set([...valid].filter(w=>w!==last));score=[...found].reduce((sum,w)=>sum+points(w),0);persist();render();return last});
 await tapWord(lastWord);assert.equal(await p.locator('#milestone-toast').getAttribute('data-kind'),'queen');assert.equal(await p.locator('#milestone-title').textContent(),'Queen Bee!');assert.match(await p.locator('#rank').textContent(),/Queen Bee/);await p.locator('#milestone-close').tap();
 await p.locator('#calendar').tap();assert.match(await p.locator('[data-date="2026-10-26"]').getAttribute('aria-label'),/Queen Bee — complete/);await p.locator('#calendar-close').tap();
 await p.reload();assert.equal(await p.locator('#milestone-toast').isVisible(),false);assert.match(await p.locator('#milestone-badges').textContent(),/Queen Bee/);
 // Dialogs and larger letters remain usable at narrow widths and on desktop.
 for(const width of [320,390,430,1024]){await p.setViewportSize({width,height:844});await p.locator('#calendar').tap();assert.ok(await p.locator('#calendar-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`calendar-${width}.png`)})}await p.locator('#calendar-close').tap();await p.getByRole('button',{name:'Definition of coefficient',exact:true}).tap();assert.ok(await p.locator('#definition-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));await p.locator('#definition-close').tap();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).every(e=>parseFloat(getComputedStyle(e).fontSize)>=14.4))) }
 assert.deepEqual(errors,[]);await ctx.close();console.log('Discovery tests passed: definitions/cache/errors/attribution, modal keyboard isolation, archive date storage and streak isolation, calendar boundaries/month navigation/assisted and completion states, first-pangram/Genius/Queen Bee thresholds without replay, larger letters and 320–1024 px layouts.');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
