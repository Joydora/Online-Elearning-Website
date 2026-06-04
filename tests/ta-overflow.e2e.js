// Deterministic test for the AI Teaching Assistant overflow fix:
// inject a long unbroken string into the real chat container (with the real bubble
// classes) and assert it does NOT cause horizontal overflow of the chat or the page.
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

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: findBrowser(), args: ['--no-sandbox'] });
  const s = await login('student2@gmail.com');
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1400, height: 950 });
  const auth = JSON.stringify({ state: { user: s.user, isAuthenticated: true }, version: 0 });
  await pg.evaluateOnNewDocument((t, a) => { localStorage.setItem('token', t); localStorage.setItem('auth-store', a); }, s.token, auth);

  await pg.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
  await pg.waitForFunction(() => document.body.innerText.includes('AI Teaching Assistant'), { timeout: 25000 });

  const result = await pg.evaluate(() => {
    const container = [...document.querySelectorAll('div')].find(
      (d) => d.className.includes('max-h-80') && d.className.includes('overflow-x-hidden'));
    if (!container) return { found: false };

    // Build a bubble with the SAME classes the app uses, holding a 400-char unbroken token
    // (simulates a long URL / code blob the LLM might return).
    const bubble = document.createElement('div');
    bubble.className = 'rounded-lg p-3 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full bg-zinc-900 text-zinc-200 border border-zinc-700';
    bubble.textContent = 'https://example.com/' + 'x'.repeat(380);
    container.appendChild(bubble);

    // Force layout
    void container.offsetHeight;

    const chatOverflowX = container.scrollWidth - container.clientWidth;       // should be ~0
    const pageOverflowX = document.documentElement.scrollWidth - window.innerWidth; // should be ~0
    return {
      found: true,
      chatOverflowX,
      pageOverflowX,
      chatNoXOverflow: chatOverflowX <= 2,
      pageNoXOverflow: pageOverflowX <= 2,
    };
  });

  await pg.screenshot({ path: 'tests/ta-overflow.png' }).catch(() => {});
  await browser.close();

  console.log('TA overflow test:', JSON.stringify(result));
  if (!result.found) { console.log('❌ FAIL: chat container not found'); process.exitCode = 1; return; }
  const pass = result.chatNoXOverflow && result.pageNoXOverflow;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  long unbroken message does not overflow horizontally ` +
    `(chatOverflowX=${result.chatOverflowX}px, pageOverflowX=${result.pageOverflowX}px)`);
  process.exitCode = pass ? 0 : 1;
})();
