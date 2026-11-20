// test/duman.mjs: duman testi. Sayfa acilir, konsolda hata yok, oyun baslar, bir etkilesim durumu degistirir,
// telefon gorunumunde tasma yok, eski kayitla acilis calisir, v2.1 ozellikleri (Yenilikler, rekor) calisir.
// Kullanim:  node test/duman.mjs [--root <klasor>] [--label etiket]
//   PW_CHROMIUM=<tarayici exe yolu>   kurulu bir Chromium/Edge (yoksa playwright'in kendi tarayicisi)
//   PW_DIR=<klasor>                   playwright ya da playwright-core'un bulundugu node_modules (yoksa tools/node_modules)
//   DUMAN_SHOTS=<klasor>              verilirse ekran goruntuleri oraya yazilir
// Hicbir bagimlilik depoya eklenmez. --root ile baska bir kopya (ornegin origin/main cikarimi) ayni testle denenir;
// v2.1'e ozgu kontroller "yeni" etiketiyle yazilir ve eski surumde eksik sayilir (cikis kodunu etkilemez).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const root = arg('--root', join(here, '..'));
const label = arg('--label', 'aday');
const shots = process.env.DUMAN_SHOTS; if (shots) mkdirSync(shots, { recursive: true });

async function loadPw() {
  const dirs = [process.env.PW_DIR, join(here, '..', 'tools', 'node_modules')].filter(Boolean);
  for (const d of dirs) for (const n of ['playwright', 'playwright-core']) {
    try { return createRequire(join(d, 'x.js'))(n); } catch (e) { /* sonraki */ }
  }
  try { return await import('playwright'); } catch (e) { /* yok */ }
  console.log('FAIL playwright bulunamadi (PW_DIR verin)'); process.exit(2);
}
const pw = await loadPw();
const chromium = pw.chromium || pw.default?.chromium;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.gif': 'image/gif' };
const server = createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = normalize(join(root, p));
  if (!f.startsWith(normalize(root)) || !existsSync(f) || statSync(f).isDirectory()) { r.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise(res => server.listen(0, '127.0.0.1', res));
const base = `http://127.0.0.1:${server.address().port}`;

let fails = 0, yeniEksik = 0;
const ok = (name, cond, extra = '', yeni = false) => {
  if (cond) console.log(`ok   ${name}${extra ? ' ' + extra : ''}`);
  else if (yeni) { yeniEksik++; console.log(`yeni-yok ${name}${extra ? ' ' + extra : ''}`); }
  else { fails++; console.log(`FAIL ${name}${extra ? ' ' + extra : ''}`); }
};
const IGN = /gc\.zgo\.at|goatcounter|fonts\.(googleapis|gstatic)/;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open(ctxOpts, path) {
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route(IGN, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !IGN.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (!IGN.test(r.url())) errs.push('failed ' + r.url()); });
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.getElementById('btn-play') && !document.getElementById('loading')?.offsetParent && window.pamukkale, null, { timeout: 120000 });
  return { ctx, page, errs, ms: Date.now() - t0 };
}
const scr = page => page.evaluate(() => window.pamukkale && window.pamukkale.screen);
const shot = (page, n) => shots ? page.screenshot({ path: join(shots, `${label}-${n}.png`) }) : null;

try {
  // ---- masaustu 1366x768, temiz kayit
  const D = await open({ viewport: { width: 1366, height: 768 } }, '/?menu&noassets');
  const { page } = D;
  ok('sayfa aciliyor, baslik', /Pamukkale/.test(await page.title()), `(${await page.title()}) ${D.ms} ms`);
  ok('baslik ekraninda "Oyna" gorunur', await page.isVisible('#btn-play'));
  await shot(page, 'baslik');
  const verText = await page.evaluate(() => document.querySelector('.footer')?.textContent || '');
  ok('surum etiketi', /v2\.1 · (Kasım|November) 2026/.test(verText), `(${verText.trim()})`, true);
  ok('"Diger oyunlar" baglantisi', await page.evaluate(() => [...document.querySelectorAll('a')].some(a => a.href === 'https://furkiozknn.github.io/')), '', true);
  const hasNews = await page.evaluate(() => !!document.getElementById('btn-news'));
  ok('Yenilikler dugmesi', hasNews, '', true);
  if (hasNews) {
    ok('Yenilikler dugmesinde "yeni" noktasi', await page.evaluate(() => document.getElementById('btn-news').classList.contains('has-new')), '', true);
    await page.click('#btn-news');
    ok('Yenilikler penceresi 4 madde', (await page.locator('#news-list li').count()) === 4 && (await scr(page)) === 'news');
    await shot(page, 'yenilikler');
    await page.keyboard.press('Escape');
    ok('Escape menuye doner, nokta kalkar', (await scr(page)) === 'title' && !(await page.evaluate(() => document.getElementById('btn-news').classList.contains('has-new'))));
  }
  // ---- oyuna basla: seviye 1 (cozum: dam 2,5), arac koy, suyu ac
  await page.click('#btn-play');
  ok('oyun basliyor (play)', (await scr(page)) === 'play');
  const s0 = await page.evaluate(() => ({ used: window.pamukkale.used, em: window.pamukkale.emitted }));
  await page.keyboard.press('2');
  const xy = await page.evaluate(() => window.pamukkaleCellXY && window.pamukkaleCellXY(2, 5));
  ok('hucre koordinati kancasi', !!xy, '', true);
  if (xy) await page.mouse.click(xy.x, xy.y);
  const s1 = await page.evaluate(() => window.pamukkale.used);
  ok('etkilesim: arac yerlesti', s1 === s0.used + 1, `(${s0.used} -> ${s1})`, !xy);
  await page.click('#btn-run', { force: true }); // ogretici dugmesi titresir, "kararli" beklenmez
  await page.waitForFunction(() => window.pamukkale.running && window.pamukkale.emitted > 0, null, { timeout: 30000 }).catch(() => {});
  const w1 = await page.evaluate(() => window.pamukkale.emitted);
  ok('etkilesim: su akiyor, durum degisti', w1 > s0.em, `(emitted ${s0.em} -> ${w1})`);
  await page.keyboard.press('p');
  ok('duraklat (P)', (await scr(page)) === 'pause');
  await page.keyboard.press('p');
  ok('devam (P)', (await scr(page)) === 'play');
  await page.evaluate(() => window.pamukkaleSim(400));
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => ({ screen: window.pamukkale.screen, title: document.getElementById('res-title').textContent, rec: document.querySelector('.rec-line')?.textContent || '' }));
  ok('seviye bitti: sonuc ekrani', res.screen === 'result', `(${res.title})`);
  await shot(page, 'sonuc');
  ok('seviye 1 kazanildi', xy ? res.title === 'Seviye tamamlandı' : true, `(${res.title})`);
  ok('rekor satiri', /Rekor: 1 araç/.test(res.rec), `("${res.rec}")`, true);
  const ls = await page.evaluate(() => ({ save: localStorage.getItem('arena.pamukkale.save'), rec: localStorage.getItem('arena.pamukkale.records') }));
  ok('kayit yazildi (save)', !!ls.save && JSON.parse(ls.save).unlocked >= 2);
  ok('rekor kaydi', !!ls.rec && JSON.parse(ls.rec)['0'] === 1, `(${ls.rec})`, true);
  ok('masaustu konsol/ag hatasi yok', D.errs.length === 0, D.errs.join(' | '));
  const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const sz = performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0); return { dcl: Math.round(n.domContentLoadedEventEnd), size: sz }; });
  console.log(`note masaustu: DOMContentLoaded ${perf.dcl} ms, alt kaynak ${(perf.size / 1024).toFixed(0)} KB, index.html ${(statSync(join(root, 'index.html')).size / 1024).toFixed(0)} KB`);
  await D.ctx.close();

  // ---- eski kayitla acilis
  const O = await open({ viewport: { width: 1366, height: 768 } }, '/?menu&noassets');
  await O.page.evaluate(() => {
    localStorage.setItem('arena.pamukkale.save', JSON.stringify({ unlocked: 4, stars: { 0: 3, 1: 2, 2: 1 }, last: 3 }));
    localStorage.setItem('arena.pamukkale.best', JSON.stringify({ stars: 6, done: 3 }));
    localStorage.setItem('arena.pamukkale.settings', JSON.stringify({ master: 0.5, music: 0.5, sfx: 0.5, lang: 'en', quality: 'low', musicOn: true, sfxOn: true }));
  });
  await O.page.reload({ waitUntil: 'load' });
  await O.page.waitForFunction(() => window.pamukkale && window.pamukkale.screen === 'title', null, { timeout: 120000 });
  ok('eski kayit: "Devam et" gorunur, dil korunur', (await O.page.isVisible('#btn-continue')) && (await O.page.evaluate(() => document.documentElement.lang)) === 'en');
  ok('eski kayit: en iyi satiri', /6\/69/.test(await O.page.textContent('#best-line')), `(${await O.page.textContent('#best-line')})`);
  await O.page.click('#btn-areas');
  const lockInfo = await O.page.evaluate(() => [...document.querySelectorAll('#areas-grid .lvl')].map(b => b.disabled).slice(0, 6).join(','));
  ok('eski kayit: seviye kilitleri korunur', lockInfo === 'false,false,false,false,true,true', `(${lockInfo})`);
  const savedAfter = await O.page.evaluate(() => JSON.parse(localStorage.getItem('arena.pamukkale.save')).unlocked);
  ok('eski kayit bozulmadi', savedAfter === 4);
  ok('eski kayit: hata yok', O.errs.length === 0, O.errs.join(' | '));
  await O.ctx.close();

  // ---- telefon 390x844, dokunmatik
  const M = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '/?menu&noassets');
  const geo = async () => M.page.evaluate(() => {
    const W = innerWidth, bad = [], small = [];
    for (const b of document.querySelectorAll('button, a.btn, input')) {
      const r = b.getBoundingClientRect(); if (!r.width || !b.offsetParent) continue;
      if (r.left < -0.5 || r.right > W + 0.5) bad.push((b.id || b.textContent.trim().slice(0, 14)) + `[${Math.round(r.left)},${Math.round(r.right)}]`);
      if (r.height < 40) small.push((b.id || b.textContent.trim().slice(0, 12)) + ':' + Math.round(r.height));
    }
    return { over: document.documentElement.scrollWidth - W, bad, small };
  });
  let g = await geo();
  ok('telefon: baslik ekrani tasma yok', g.over <= 0 && g.bad.length === 0, JSON.stringify(g.bad));
  await shot(M.page, 'telefon-baslik');
  if (await M.page.evaluate(() => !!document.getElementById('btn-news'))) {
    await M.page.tap('#btn-news'); g = await geo();
    ok('telefon: Yenilikler tasma yok', g.over <= 0 && g.bad.length === 0, JSON.stringify(g.bad));
    await shot(M.page, 'telefon-yenilikler');
    await M.page.tap('#btn-news-back');
  }
  await M.page.tap('#btn-play'); await M.page.waitForTimeout(500);
  g = await geo();
  ok('telefon: oyun ekrani tasma yok', g.over <= 0 && g.bad.length === 0, JSON.stringify(g.bad));
  console.log(`note telefon dokunma hedefi <40px yukseklik: ${g.small.join(', ') || 'yok'}`);
  await shot(M.page, 'telefon-oyun');
  ok('telefon: konsol/ag hatasi yok', M.errs.length === 0, M.errs.join(' | '));
  await M.ctx.close();
} catch (e) { fails++; console.log('FAIL istisna: ' + (e && e.stack || e)); }
await browser.close(); server.close();
console.log(`RESULT ${fails ? 'FAIL' : 'OK'} [${label}] basarisiz=${fails}, yeni-surume-ozgu eksik=${yeniEksik}`);
process.exit(fails ? 1 : 0);
