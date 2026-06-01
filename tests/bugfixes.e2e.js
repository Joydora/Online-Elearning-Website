// Puppeteer E2E for the two bug fixes:
//  (1) Teacher/admin can open their own course in the learning player.
//  (2) Student/guest free-preview video renders (YouTube as an embed, not a broken <video>).
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'http://localhost:5173';
const API = 'http://localhost:3001/api';
const PW = 'Password123!';

function findBrowser() {
  return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((p) => fs.existsSync(p));
}
async function login(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, username: email, password: PW }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return r.json();
}
const results = [];
const rec = (n, p, d) => { results.push({ n, p, d }); console.log(`${p ? '✅ PASS' : '❌ FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

async function page(browser, session) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1400, height: 950 });
  if (session) {
    const auth = JSON.stringify({ state: { user: session.user, isAuthenticated: true }, version: 0 });
    await pg.evaluateOnNewDocument((t, a) => { localStorage.setItem('token', t); localStorage.setItem('auth-store', a); }, session.token, auth);
  }
  return pg;
}
const hasText = (pg, t, timeout = 30000) =>
  pg.waitForFunction((x) => document.body && document.body.innerText.includes(x), { timeout }, t).then(() => true).catch(() => false);
const clickByText = (pg, sel, t) =>
  pg.evaluate((s, x) => { const el = [...document.querySelectorAll(s)].find((e) => e.innerText.includes(x)); if (el) { el.click(); return true; } return false; }, sel, t);
const shot = (pg, n) => pg.screenshot({ path: `tests/bugfix-${n}.png` }).catch(() => {});

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: findBrowser(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const teacher = await login('nguyenvana@gmail.com'); // owns course 1
  const admin = await login('admin@gmail.com');

  // ---- BUG 1a: owning teacher can open /learning/1 ----
  try {
    const pg = await page(browser, teacher);
    await pg.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    const loaded = await hasText(pg, 'Nội dung khóa học', 25000);
    const title = await hasText(pg, 'Học React JS', 8000);
    const url = pg.url();
    const notRedirected = url.includes('/learning/1');
    await shot(pg, 'teacher-player');
    rec('BUG1 Teacher opens own course player', loaded && title && notRedirected, `sidebar=${loaded}, title=${title}, url=${url}`);
    await pg.close();
  } catch (e) { rec('BUG1 Teacher player', false, e.message); }

  // ---- BUG 1b: admin can open /learning/1 ----
  try {
    const pg = await page(browser, admin);
    await pg.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    const loaded = await hasText(pg, 'Nội dung khóa học', 25000);
    const notRedirected = pg.url().includes('/learning/1');
    await shot(pg, 'admin-player');
    rec('BUG1 Admin opens course player', loaded && notRedirected, `sidebar=${loaded}, url=${pg.url()}`);
    await pg.close();
  } catch (e) { rec('BUG1 Admin player', false, e.message); }

  // ---- BUG 2: guest free-preview renders a YouTube iframe (not broken <video>) ----
  try {
    const pg = await page(browser); // guest
    await pg.goto(`${APP}/courses/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    await hasText(pg, 'Nội dung khóa học', 20000);
    await clickByText(pg, 'button', 'Chương 1');          // expand module
    await new Promise((r) => setTimeout(r, 700));
    const clicked = await clickByText(pg, 'button', 'React là gì');  // free-preview lesson
    await new Promise((r) => setTimeout(r, 2500));
    // The fix: a YouTube embed iframe must be present in the preview modal.
    const embedSrc = await pg.evaluate(() => {
      const f = [...document.querySelectorAll('iframe')].find((x) => (x.src || '').includes('youtube.com/embed'));
      return f ? f.src : null;
    });
    await shot(pg, 'preview-video');
    rec('BUG2 Free-preview YouTube embed renders', clicked && !!embedSrc, `clicked=${clicked}, embedSrc=${embedSrc}`);
    await pg.close();
  } catch (e) { rec('BUG2 Free preview', false, e.message); }

  await browser.close();
  const passed = results.filter((r) => r.p).length;
  console.log('\n==================== BUGFIX TEST SUMMARY ====================');
  for (const r of results) console.log(`${r.p ? '✅' : '❌'} ${r.n}${r.d ? '  (' + r.d + ')' : ''}`);
  console.log(`\n${passed}/${results.length} bug-fix checks passed.`);
  console.log('Screenshots: tests/bugfix-*.png');
  process.exitCode = passed === results.length ? 0 : 1;
})();
