// Puppeteer E2E test: drives the real Chatbot UI and verifies the AI answers.
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const QUESTION = process.env.QUESTION || 'What courses are available on this platform?';

// Prefer an already-installed system browser (puppeteer's bundled Chrome download is flaky here).
function findBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

(async () => {
  const executablePath = findBrowser();
  console.log(`[e2e] Using browser: ${executablePath || '(puppeteer bundled)'}`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const log = (m) => console.log(`[e2e] ${m}`);

  try {
    log(`Opening ${APP_URL} ...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1) Open the floating chatbot button (fixed, bottom-right, red).
    log('Looking for the chatbot toggle button...');
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('button')].some(
        (b) => b.className.includes('fixed') && b.className.includes('bottom-4')
      );
    }, { timeout: 30000 });

    await page.evaluate(() => {
      const toggle = [...document.querySelectorAll('button')].find(
        (b) => b.className.includes('fixed') && b.className.includes('bottom-4')
      );
      toggle.click();
    });
    log('Clicked chatbot button.');

    // 2) Wait for the chat input to appear.
    const inputSel = 'input[placeholder="Nhập câu hỏi của bạn..."]';
    await page.waitForSelector(inputSel, { timeout: 15000 });

    // Count message bubbles before we ask (greeting = 1).
    const bubbleSel = 'p.text-sm.whitespace-pre-wrap.break-words';
    const before = await page.$$eval(bubbleSel, (els) => els.length);
    log(`Message bubbles before asking: ${before}`);

    // 3) Type the question and send it.
    log(`Asking: "${QUESTION}"`);
    await page.click(inputSel);
    await page.type(inputSel, QUESTION, { delay: 10 });
    await page.keyboard.press('Enter');

    // 4) Confirm the "thinking" indicator shows (request fired).
    const thinking = await page
      .waitForFunction(
        () => document.body.innerText.includes('Đang suy nghĩ'),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);
    log(`"Đang suy nghĩ..." (thinking) indicator seen: ${thinking}`);

    // 5) Wait for a NEW assistant bubble AND the thinking indicator to clear.
    log('Waiting for AI answer (model can take a while on CPU)...');
    const start = Date.now();
    await page.waitForFunction(
      (sel, prev) => {
        const count = document.querySelectorAll(sel).length;
        const stillThinking = document.body.innerText.includes('Đang suy nghĩ');
        return count > prev + 1 && !stillThinking;
      },
      { timeout: 180000, polling: 1000 },
      bubbleSel,
      before
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    // 6) Grab the last bubble = the AI's answer.
    const answer = await page.$$eval(bubbleSel, (els) =>
      els.length ? els[els.length - 1].innerText.trim() : ''
    );

    const errorReply = answer.includes('đã có lỗi xảy ra'); // UI's catch-block message

    await page.screenshot({ path: 'tests/ai-chatbot-result.png', fullPage: false });

    console.log('\n==================== RESULT ====================');
    console.log(`Answer time: ${elapsed}s`);
    console.log(`AI answer:\n${answer}`);
    console.log('Screenshot: tests/ai-chatbot-result.png');
    console.log('================================================\n');

    if (!answer || errorReply) {
      console.log('❌ FAIL: chatbot returned an error / empty answer.');
      process.exitCode = 1;
    } else {
      console.log('✅ PASS: chatbot returned a real AI answer through the UI.');
    }
  } catch (err) {
    console.error('❌ FAIL: test threw an error:', err.message);
    try {
      await page.screenshot({ path: 'tests/ai-chatbot-error.png', fullPage: false });
      console.error('Saved tests/ai-chatbot-error.png');
    } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
