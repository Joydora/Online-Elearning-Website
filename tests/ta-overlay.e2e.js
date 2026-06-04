// Verify the AI Teaching Assistant now opens as a large overlay (not the tiny inline panel).
const puppeteer = require('puppeteer');
const fs = require('fs');
const APP = 'http://localhost:5173';
const API = 'http://localhost:3001/api';

function findBrowser() {
  return ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
}
async function login(email) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, username: email, password: 'Password123!' }) });
  return r.json();
}
const clickByText = (pg, sel, t) =>
  pg.evaluate((s, x) => { const el = [...document.querySelectorAll(s)].find((e) => e.innerText.includes(x)); if (el) { el.click(); return true; } return false; }, sel, t);

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: findBrowser(), args: ['--no-sandbox'] });
  const s = await login('student2@gmail.com');
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1400, height: 950 });
  const auth = JSON.stringify({ state: { user: s.user, isAuthenticated: true }, version: 0 });
  await pg.evaluateOnNewDocument((t, a) => { localStorage.setItem('token', t); localStorage.setItem('auth-store', a); }, s.token, auth);

  await pg.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
  await pg.waitForFunction(() => document.body.innerText.includes('AI Teaching Assistant'), { timeout: 25000 });

  // Overlay should NOT exist before clicking.
  const before = await pg.evaluate(() => !!document.querySelector('.fixed.inset-0.z-\\[60\\]'));

  // Click the sidebar trigger button.
  const clicked = await clickByText(pg, 'button', 'AI Teaching Assistant');
  await new Promise((r) => setTimeout(r, 600));

  const open = await pg.evaluate(() => {
    const overlay = document.querySelector('.z-\\[60\\]');
    if (!overlay) return { present: false };
    const card = overlay.querySelector('input') ? overlay : null;
    const inputEl = overlay.querySelector('input');
    // measure the modal card (the input's offsetParent chain) — use the overlay's first element child
    const panel = overlay.firstElementChild;
    const rect = panel.getBoundingClientRect();
    return {
      present: true,
      hasInput: !!inputEl,
      hasQuizBtn: overlay.innerText.includes('Gợi ý câu hỏi quiz'),
      panelW: Math.round(rect.width),
      panelH: Math.round(rect.height),
    };
  });
  await pg.screenshot({ path: 'tests/ta-overlay-open.png' }).catch(() => {});

  // Close via backdrop click (top-left corner, outside the card).
  await pg.mouse.click(20, 20);
  await new Promise((r) => setTimeout(r, 500));
  const afterClose = await pg.evaluate(() => !!document.querySelector('.z-\\[60\\]'));

  await browser.close();

  // A "large" overlay = panel noticeably bigger than the old max-h-80 (~320px) inline panel.
  const bigEnough = open.present && open.panelH >= 500 && open.panelW >= 500;
  const pass = !before && open.present && open.hasInput && open.hasQuizBtn && bigEnough && !afterClose;
  console.log('TA overlay test:', JSON.stringify({ before, ...open, afterClose }));
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  AI section opens as a large overlay and closes ` +
    `(panel=${open.panelW}x${open.panelH}px, input=${open.hasInput}, quizBtn=${open.hasQuizBtn}, closed=${!afterClose})`);
  process.exitCode = pass ? 0 : 1;
})();
