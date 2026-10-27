const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const words=JSON.parse(html.match(/const dictionary=new Set\((.*?)\.split/)[1]).split(' ');
const dictionary=new Set(words);
const audit=JSON.parse(fs.readFileSync(path.join(__dirname,'dictionary-audit.json')));
assert.equal(dictionary.size,80735);
assert.equal(audit.entries,dictionary.size);
assert.equal(crypto.createHash('sha256').update(words.join('\n')+'\n').digest('hex'),audit.words_sha256);
assert.ok(words.every(w=>/^[A-Z]{4,24}$/.test(w)));
for(const w of ['COIN','NOTE','NICE','FINE','COLOR','COLOUR','CENTER','CENTRE','ORGANIZE','ORGANISE','CATS','WALKED','WALKING','CAFE','COEFFICIENT']) assert.ok(dictionary.has(w),w);
for(const w of ['AILEEN','CLINTON','CINCINNATI','CECCONI','WHITMER','ACCOR','CNNFN','NNNNN']) assert.ok(!dictionary.has(w),w);
const puzzles=JSON.parse(html.match(/const puzzles=(.*?);/)[1]);
assert.equal(puzzles.length,45);
for(const [i,p] of puzzles.entries()){
  const valid=words.filter(w=>w.includes(p.center)&&[...w].every(c=>p.letters.includes(c)));
  assert.equal(new Set(p.letters).size,7);
  assert.ok(p.letters.includes(p.center));
  assert.equal(valid.length,audit.puzzles[i].words);
  assert.deepEqual(valid.filter(w=>new Set(w).size===7),audit.puzzles[i].pangrams);
  assert.ok(audit.puzzles[i].pangrams.length);
}
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
    const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.clock.setFixedTime(new Date('2026-10-26T19:00:00-07:00'));
    await p.goto(`http://127.0.0.1:${server.address().port}/`);
    const original=JSON.stringify({'d2026-10-26':{words:['COIN','COEFFICIENT','CECCONI','COIN',null]},p4:{words:['WITHER','WHITMER','MIRTH']},p999:{words:['COIN']}});
    await p.evaluate(raw=>localStorage.setItem('word-hive-v3',raw),original);
    await p.reload();
    assert.equal(await p.locator('#score').textContent(),'19 pts');
    assert.match(await p.locator('#stats').textContent(),/Best: 19 points/);
    assert.match(await p.locator('#msg').textContent(),/valid saved words kept/);
    assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('word-hive-v3'))),{'d2026-10-26':{words:['COIN','COEFFICIENT']},p4:{words:['WITHER']}});
    assert.equal(await p.evaluate(()=>localStorage.getItem('word-hive-v3-before-dictionary-2026-10')),original);
    for(const letter of 'FINE')await p.getByRole('button',{name:letter,exact:true}).tap();
    await p.locator('#enter').tap();assert.equal(await p.locator('#score').textContent(),'20 pts');
    for(const letter of 'CECCONI')await p.getByRole('button',{name:letter,exact:true}).tap();
    await p.locator('#enter').tap();assert.match(await p.locator('#msg').textContent(),/Not in this puzzle/);
    await p.reload();assert.equal(await p.locator('#score').textContent(),'20 pts');
    assert.equal(await p.evaluate(()=>localStorage.getItem('word-hive-v3-before-dictionary-2026-10')),original);
    // A quota failure while backing up must leave the original saved record intact.
    await p.evaluate(raw=>{localStorage.removeItem('word-hive-v3-before-dictionary-2026-10');localStorage.setItem('word-hive-v3',raw)},original);
    await p.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.endsWith('before-dictionary-2026-10'))throw new DOMException('full','QuotaExceededError');return set.call(this,k,v)}});
    await p.reload();assert.match(await p.locator('#msg').textContent(),/cannot be saved/);
    for(const letter of 'FINE')await p.getByRole('button',{name:letter,exact:true}).tap();
    await p.locator('#enter').tap();
    assert.equal(await p.evaluate(()=>localStorage.getItem('word-hive-v3')),original);
    assert.deepEqual(errors,[]);
    console.log('Dictionary tests passed: 80,735 entries, dialects/inflections, rejected names, 45 pangrams, progress migration, immutable backup and quota-failure protection.');
  }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
