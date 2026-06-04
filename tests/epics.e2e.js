// Puppeteer E2E: drives all 7 epics through the real UI and reports pass/fail.
// Usage: node tests/epics.e2e.js
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'http://localhost:5173';
const API = 'http://localhost:3001/api';
const PW = 'Password123!';

function findBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((p) => fs.existsSync(p));
}

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, username: email, password: PW }),
  });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status}`);
  return res.json(); // { token, user }
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function newPage(browser, session) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });
  if (session) {
    const authState = JSON.stringify({ state: { user: session.user, isAuthenticated: true }, version: 0 });
    await page.evaluateOnNewDocument(
      (token, auth) => {
        localStorage.setItem('token', token);
        localStorage.setItem('auth-store', auth);
      },
      session.token,
      authState,
    );
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.__errors = errors;
  return page;
}

const hasText = (page, text, timeout = 30000) =>
  page.waitForFunction((t) => document.body && document.body.innerText.includes(t), { timeout }, text)
    .then(() => true).catch(() => false);

const bodyText = (page) => page.evaluate(() => document.body.innerText);

async function clickByText(page, selector, text) {
  return page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);
}

const shot = (page, name) => page.screenshot({ path: `tests/epic-${name}.png` }).catch(() => {});

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: findBrowser(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Pre-login the accounts we need.
  const [student1, student2, student3, admin] = await Promise.all([
    login('student1@gmail.com'),
    login('student2@gmail.com'),
    login('student3@gmail.com'),
    login('admin@gmail.com'),
  ]);

  // ---------- EPIC 1: Trial / Free preview (guest on course detail) ----------
  try {
    const page = await newPage(browser);
    await page.goto(`${APP}/courses/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    await hasText(page, 'React', 30000);
    const trial = await hasText(page, 'Học thử', 8000);
    // Curriculum accordion is collapsed by default — expand the first module to reveal the free-preview label.
    await clickByText(page, 'button', 'Chương 1');
    await new Promise((r) => setTimeout(r, 800));
    const preview = await hasText(page, 'Xem miễn phí', 8000);
    await shot(page, '1-trial');
    record('EPIC1 Trial button + free-preview label', trial && preview,
      `trialButton=${trial}, freePreviewLabel=${preview}`);
    await page.close();
  } catch (e) { record('EPIC1 Trial/preview', false, e.message); }

  // ---------- EPIC 2: Time-limited enrollment banner (student1, TRIAL course1) ----------
  try {
    const page = await newPage(browser, student1);
    await page.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    await hasText(page, 'React', 30000);
    const banner = await hasText(page, 'ngày truy cập', 10000); // "Còn N ngày truy cập khóa học."
    await shot(page, '2-expiry');
    record('EPIC2 Days-remaining banner', banner, `banner=${banner}`);
    await page.close();
  } catch (e) { record('EPIC2 Time-limit banner', false, e.message); }

  // ---------- EPIC 3: Practice prompt shows (student2, FREE full access to course1) ----------
  try {
    const page = await newPage(browser, student2);
    await page.goto(`${APP}/learning/1`, { waitUntil: 'networkidle2', timeout: 60000 });
    await hasText(page, 'Thực hành: useState', 30000); // sidebar item present
    const clicked = await clickByText(page, 'button', 'Thực hành: useState');
    await new Promise((r) => setTimeout(r, 1500));
    await hasText(page, 'Bài thực hành', 15000);
    // The FIX: the seeded prompt must render (was blank before).
    const promptShown = await hasText(page, 'Tạo một component React', 15000);
    const titleShown = await hasText(page, 'Thực hành: useState', 5000);
    await shot(page, '3-practice');
    record('EPIC3 Practice prompt + title render', clicked && promptShown && titleShown,
      `clicked=${clicked}, prompt=${promptShown}, title=${titleShown}`);
    await page.close();
  } catch (e) { record('EPIC3 Practice display', false, e.message); }

  // ---------- EPIC 4: Admin revenue ledger ----------
  try {
    const page = await newPage(browser, admin);
    await page.goto(`${APP}/admin/revenue`, { waitUntil: 'networkidle2', timeout: 60000 });
    const loaded = await hasText(page, 'TypeScript Mastery', 20000); // ledger row (course2)
    const held = await hasText(page, 'HELD', 8000);
    await shot(page, '4-revenue');
    record('EPIC4 Revenue ledger table', loaded, `ledgerRow=${loaded}, heldStatus=${held}`);
    await page.close();
  } catch (e) { record('EPIC4 Revenue ledger', false, e.message); }

  // ---------- EPIC 5: Learning-path recommendation (uses embeddings) ----------
  try {
    const page = await newPage(browser);
    await page.goto(`${APP}/learning-path`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('textarea', { timeout: 15000 });
    await page.type('textarea', 'Tôi muốn trở thành lập trình viên web fullstack');
    await clickByText(page, 'button', 'Gợi ý lộ trình');
    const got = await hasText(page, 'Lộ trình đề xuất', 90000); // recommendations rendered
    await shot(page, '5-learning-path');
    record('EPIC5 AI learning-path recommendation', got, `recommendationsRendered=${got}`);
    await page.close();
  } catch (e) { record('EPIC5 Learning path', false, e.message); }

  // ---------- EPIC 6: Project-based learning + commit timeline (student3, course4) ----------
  try {
    const page = await newPage(browser, student3);
    await page.goto(`${APP}/learning/4/projects`, { waitUntil: 'networkidle2', timeout: 60000 });
    const proj = await hasText(page, 'Todo App', 25000); // project title
    const commit = await hasText(page, 'Add CRUD endpoints', 10000) || await hasText(page, 'Init project', 5000);
    await shot(page, '6-projects');
    record('EPIC6 Projects + commit timeline', proj && commit, `project=${proj}, commitTimeline=${commit}`);
    await page.close();
  } catch (e) { record('EPIC6 Projects', false, e.message); }

  // ---------- EPIC 7: Progress dashboard (student2, course1) ----------
  try {
    const page = await newPage(browser, student2);
    await page.goto(`${APP}/learning/1/progress`, { waitUntil: 'networkidle2', timeout: 60000 });
    const modules = await hasText(page, 'Chương 1', 25000);
    const pct = await page.evaluate(() => /\d+%/.test(document.body.innerText));
    await shot(page, '7-progress');
    record('EPIC7 Progress dashboard (modules + %)', modules && pct, `modules=${modules}, percent=${pct}`);
    await page.close();
  } catch (e) { record('EPIC7 Progress dashboard', false, e.message); }

  await browser.close();

  console.log('\n==================== EPIC TEST SUMMARY ====================');
  const passed = results.filter((r) => r.pass).length;
  for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
  console.log(`\n${passed}/${results.length} epics passed.`);
  console.log('Screenshots: tests/epic-*.png');
  console.log('==========================================================');
  process.exitCode = passed === results.length ? 0 : 1;
})();
