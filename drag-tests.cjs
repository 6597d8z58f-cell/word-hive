const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'index.html'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00-07:00'));await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const tile=i=>page.locator(`.hex[data-pos="${i}"]`),arrangement=()=>page.locator('.hex').evaluateAll(els=>Object.fromEntries(els.map(e=>[e.dataset.pos,e.textContent])));
  const centerOf=async i=>{const b=await tile(i).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2}};
  await page.locator('#board').scrollIntoViewIfNeeded();
  const original=await arrangement();await tile(0).tap();assert.equal(await page.locator('#entry').textContent(),original[0]);
  const mouseDrag=async(from,to)=>{const a=await centerOf(from),b=typeof to==='number'?await centerOf(to):to;await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up()};
  await mouseDrag(0,1);let expected={...original,0:original[1],1:original[0]};assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('#entry').textContent(),original[0]);assert.equal(await page.locator('.drag-letter').count(),0);
  await tile(0).tap();assert.equal(await page.locator('#entry').textContent(),original[0]+original[1]);
  const entryBefore=await page.locator('#entry').textContent();
  await mouseDrag(1,6);assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('#entry').textContent(),entryBefore);
  await mouseDrag(1,{x:5,y:5});assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('#entry').textContent(),entryBefore);
  await mouseDrag(6,0);assert.deepEqual(await arrangement(),expected);
  // A small amount of finger jitter still produces a normal tap.
  const cd=await ctx.newCDPSession(page);
  const touch=async(type,point)=>cd.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{...point,id:1,radiusX:2,radiusY:2}]:[]});
  let a=await centerOf(2);await touch('touchStart',a);await touch('touchMove',{x:a.x+3,y:a.y+2});await touch('touchEnd');assert.equal(await page.locator('#entry').textContent(),entryBefore+expected[2]);
  const touchDrag=async(from,to,{cancel=false,finish=true}={})=>{const a=await centerOf(from),b=await centerOf(to);await touch('touchStart',a);for(let i=1;i<=8;i++)await touch('touchMove',{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8});if(finish)await touch(cancel?'touchCancel':'touchEnd')};
  const priorEntry=await page.locator('#entry').textContent(),priorScroll=await page.evaluate(()=>scrollY);
  await touchDrag(2,5);[expected[2],expected[5]]=[expected[5],expected[2]];assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('#entry').textContent(),priorEntry);assert.equal(await page.evaluate(()=>scrollY),priorScroll);
  // Cancelled gestures restore visuals and never rearrange or type a letter.
  await touchDrag(0,3,{cancel:true});assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('.drag-letter,.drag-source,.drop-target').count(),0);
  await tile(0).tap();assert.equal(await page.locator('#entry').textContent(),priorEntry+expected[0]);
  await touchDrag(4,1,{finish:false});assert.equal(await page.locator('.drag-letter').count(),1);assert.equal(await tile(1).evaluate(e=>e.classList.contains('drop-target')),true);
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'drag-active.png')})}
  await page.keyboard.press('Escape');await touch('touchEnd');assert.deepEqual(await arrangement(),expected);assert.equal(await page.locator('.drag-letter').count(),0);
  // Keyboard moves the focused letter to its adjacent clockwise position.
  await tile(0).focus();await page.keyboard.press('Shift+ArrowRight');[expected[0],expected[1]]=[expected[1],expected[0]];assert.deepEqual(await arrangement(),expected);assert.equal(await tile(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+ArrowLeft');[expected[0],expected[1]]=[expected[1],expected[0]];assert.deepEqual(await arrangement(),expected);
  // Shuffle cancels a gesture in progress and keeps every letter exactly once.
  await touchDrag(0,1,{finish:false});await page.locator('#shuffle').evaluate(e=>e.click());const shuffled=await arrangement();await touch('touchEnd');assert.deepEqual(await arrangement(),shuffled);assert.deepEqual(Object.values(shuffled).sort(),Object.values(original).sort());assert.equal(shuffled[6],original[6]);assert.equal(await page.locator('.drag-letter').count(),0);
  // Letter entry and score calculation still work after swapping and shuffling.
  await page.evaluate(()=>{entry='';render()});for(const c of 'COIN')await page.getByRole('button',{name:c,exact:true}).tap();await page.locator('#enter').tap();assert.equal(await page.locator('#score').textContent(),'1 pts');
  // Touch gestures on a new daily hive cannot modify the previous one.
  await page.locator('#board').scrollIntoViewIfNeeded();await touchDrag(0,1,{finish:false});await page.clock.setFixedTime(new Date('2026-10-27T00:00:01-07:00'));await touch('touchEnd');
  assert.equal(await page.evaluate(()=>dailyId),'2026-10-27');assert.equal(await page.locator('#score').textContent(),'0 pts');assert.equal(await page.locator('#entry').textContent(),'Tap letters to begin');assert.equal(await page.locator('.drag-letter').count(),0);
  for(const width of [320,430,1024]){await page.setViewportSize({width,height:844});await page.locator('#board').scrollIntoViewIfNeeded();const before=await arrangement();await touchDrag(4,5);const after=await arrangement();assert.equal(after[4],before[5]);assert.equal(after[5],before[4]);assert.equal(after[6],before[6]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
  assert.deepEqual(errors,[]);await ctx.close();console.log('Drag tests passed: mouse and mobile touch swaps, tap jitter, no accidental typing, fixed center, invalid drops, cancellation, keyboard alternative, shuffle, scoring, midnight cancellation and 320/390/430/1024 px layouts.');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
