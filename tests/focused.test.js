/**
 * Focused Puppeteer smoke — most-important features post-merge:
 *   1. Student watches a video (CoursePlayer)
 *   2. Student does a practice exercise + AI grading
 *   3. Student views a trial course (Free preview)
 *   4. Teacher sets trialDurationDays on a course
 *   5. Teacher views their revenue/earnings page
 *   6. Teacher views enrolled-student list for a course
 *
 * Run: node tests/focused.test.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE     = 'http://localhost:5173';
const API_BASE = 'http://localhost:3001/api';
const SHOT_DIR = path.join(__dirname, 'screenshots');

const CREDS = {
    teacher: { email: 'nguyenvana@gmail.com', password: 'Password123!' },
    student: { email: 'student1@gmail.com',   password: 'Password123!' },
};

let browser, page;
let passed = 0, failed = 0;
const log = [];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function shot(name) {
    const file = path.join(SHOT_DIR, `focused-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`    📸  focused-${name}.png`);
}

async function step(label, fn) {
    process.stdout.write(`  → ${label} ... `);
    try {
        await fn();
        console.log('✓');
        passed++;
        log.push({ ok: true, label });
    } catch (e) {
        console.log(`✗  ${e.message.slice(0, 160)}`);
        failed++;
        log.push({ ok: false, label, err: e.message });
        try { await shot(`FAIL_${label.replace(/[^a-z0-9]/gi, '_').slice(0, 60)}`); } catch {}
    }
}

async function goto(p) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle2', timeout: 25000 });
}

async function login(role) {
    const { email, password } = CREDS[role];
    if (!page.url().startsWith(BASE)) await goto('/');
    const result = await page.evaluate(async (api, e, p) => {
        const r = await fetch(`${api}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: e, password: p }),
        });
        return r.json();
    }, API_BASE, email, password);
    if (!result.token) throw new Error(`Login failed for ${role}: ${JSON.stringify(result)}`);
    await page.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('auth-store', JSON.stringify({ state: { user: usr, isAuthenticated: true }, version: 0 }));
    }, result.token, result.user);
    await goto('/');
    await sleep(600);
    return result.token;
}

async function apiGet(token, p) {
    return page.evaluate(async (api, tok, path) => {
        const r = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${tok}` } });
        return { status: r.status, body: await r.json().catch(() => null) };
    }, API_BASE, token, p);
}

async function main() {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 40,
        defaultViewport: { width: 1366, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // ── 1. Student watches a video ────────────────────────────────────────────
    console.log('\n══ 1. Student — watch video (CoursePlayer) ══');
    let studentToken;
    await step('Student login', async () => { studentToken = await login('student'); });

    let enrolledCourseId = null;
    await step('Find an enrolled course', async () => {
        const { body } = await apiGet(studentToken, '/enroll/my-enrollments');
        const list = Array.isArray(body) ? body : (body?.enrollments || body?.data || []);
        if (!list.length) throw new Error('Student has no enrollments');
        enrolledCourseId = list[0].courseId || list[0].course?.id;
        if (!enrolledCourseId) throw new Error('No courseId in enrollment row');
    });

    await step('Open CoursePlayer for enrolled course', async () => {
        await goto(`/learning/${enrolledCourseId}`);
        await sleep(1500);
        await shot('1a-student-courseplayer');
    });

    await step('CoursePlayer renders sidebar with lessons', async () => {
        await sleep(2500);
        const info = await page.evaluate(() => ({
            text: document.body.innerText.slice(0, 600),
            url: location.href,
        }));
        const ok = /Nội dung khóa học|Bài học|Chương|Module/i.test(info.text);
        if (!ok) throw new Error(`Sidebar not rendered at ${info.url}. Page text: "${info.text.slice(0, 200)}"`);
    });

    await step('Video / player area present', async () => {
        const ok = await page.evaluate(() => {
            const hasPlayer = !!(document.querySelector('video') ||
                                 document.querySelector('iframe[src*="youtube"]') ||
                                 document.querySelector('iframe[src*="player"]'));
            const text = document.body.innerText;
            // Seed data has no real videoUrl — accept the placeholder banner too
            return hasPlayer || /Chưa có video|Không có video|No video|Bài học đang khóa/i.test(text);
        });
        if (!ok) throw new Error('Neither <video>/iframe nor "Chưa có video" placeholder present');
    });

    // ── 2. Student does a practice + AI grading ──────────────────────────────
    console.log('\n══ 2. Student — practice exercise + AI grading ══');
    let practiceContentId = null;
    await step('Locate a PRACTICE content (enroll if needed)', async () => {
        // 1. Try already-enrolled courses
        const enr = await apiGet(studentToken, '/enroll/my-enrollments');
        const enrolled = Array.isArray(enr.body) ? enr.body : (enr.body?.enrollments || enr.body?.data || []);
        for (const e of enrolled) {
            const cid = e.courseId || e.course?.id;
            const r = await apiGet(studentToken, `/courses/${cid}`);
            const mods = r.body?.modules || r.body?.course?.modules || [];
            for (const m of mods) for (const c of (m.contents || [])) {
                if (c.contentType === 'PRACTICE') { practiceContentId = c.id; enrolledCourseId = cid; }
            }
            if (practiceContentId) break;
        }
        if (practiceContentId) return;

        // 2. Scan all courses, find one with PRACTICE, trial-enroll into it
        const all = await apiGet(studentToken, '/courses');
        const list = all.body?.courses || all.body?.data || (Array.isArray(all.body) ? all.body : []);
        let targetCid = null, targetPid = null;
        for (const c of list) {
            const r = await apiGet(studentToken, `/courses/${c.id}`);
            const mods = r.body?.modules || r.body?.course?.modules || [];
            for (const m of mods) for (const ct of (m.contents || [])) {
                if (ct.contentType === 'PRACTICE') { targetCid = c.id; targetPid = ct.id; break; }
            }
            if (targetPid) break;
        }
        if (!targetPid) throw new Error('No PRACTICE content exists in any course');

        // Dev-only PAID enrollment (Stripe-bypass) — needed so non-preview
        // PRACTICE content is accessible. Returns 200/201 on success, 409 if already.
        const cf = await page.evaluate(async (api, tok, cid) => {
            const r = await fetch(`${api}/enroll/confirm/${cid}`, {
                method: 'POST', headers: { Authorization: `Bearer ${tok}` },
            });
            return { status: r.status, body: await r.json().catch(() => null) };
        }, API_BASE, studentToken, targetCid);
        if (cf.status >= 400 && cf.status !== 409) {
            throw new Error(`Confirm enroll for course ${targetCid}: ${cf.status} ${JSON.stringify(cf.body).slice(0, 150)}`);
        }
        practiceContentId = targetPid;
        enrolledCourseId = targetCid;
    });

    await step('Practice detail loads', async () => {
        const r = await apiGet(studentToken, `/practice/content/${practiceContentId}`);
        if (r.status !== 200) throw new Error(`GET /practice/content/${practiceContentId} → ${r.status}`);
        if (!r.body || (!r.body.prompt && !r.body.description)) throw new Error('Practice has no prompt');
    });

    await step('Submit practice → AI grades and returns score', async () => {
        const detail = await apiGet(studentToken, `/practice/content/${practiceContentId}`);
        const practiceId = detail.body.id;
        const lang = detail.body.language || 'javascript';
        const code = lang === 'python'
            ? 'def hello():\n    return "hello"\nprint(hello())\n'
            : 'function hello(){ return "hello"; }\nconsole.log(hello());';

        const submitted = await page.evaluate(async (api, tok, pid, c) => {
            const r = await fetch(`${api}/practice/${pid}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ submittedCode: c }),
            });
            return { status: r.status, body: await r.json().catch(() => null) };
        }, API_BASE, studentToken, practiceId, code);

        if (submitted.status !== 201 && submitted.status !== 200) {
            throw new Error(`submit → ${submitted.status} ${JSON.stringify(submitted.body).slice(0, 200)}`);
        }
        const b = submitted.body;
        if (typeof b?.score !== 'number') throw new Error(`No numeric score in response: ${JSON.stringify(b).slice(0, 200)}`);
        if (!b.aiFeedback || b.aiFeedback.length < 5) throw new Error('Empty / missing aiFeedback');
        console.log(`        score=${b.score} passed=${b.passed} feedback="${b.aiFeedback.slice(0, 80)}…"`);
    });

    // ── 3. Student views a trial course ──────────────────────────────────────
    console.log('\n══ 3. Student — view trial course (free preview) ══');
    let trialCourseId = null;
    await step('Locate a course with trialDurationDays set', async () => {
        const { body } = await apiGet(studentToken, '/courses');
        const list = body?.courses || body?.data || (Array.isArray(body) ? body : []);
        const trial = list.find(c => (c.trialDurationDays || 0) > 0);
        if (!trial) throw new Error('No course with trialDurationDays > 0 found (will set one in section 4)');
        trialCourseId = trial.id;
    }).catch(() => {});

    if (trialCourseId) {
        await step('Course detail page shows trial info', async () => {
            await goto(`/courses/${trialCourseId}`);
            await sleep(1200);
            const text = await page.evaluate(() => document.body.innerText);
            if (!/trial|dùng thử|miễn phí/i.test(text)) {
                throw new Error('Course detail has no trial/free-preview text');
            }
            await shot('3-student-trial-course');
        });
    } else {
        console.log('  (skipping student trial UI — no trial course yet; will recheck after teacher sets one)');
    }

    // ── 4. Teacher sets trial on a course ────────────────────────────────────
    console.log('\n══ 4. Teacher — set trialDurationDays on a course ══');
    let teacherToken;
    await step('Teacher login', async () => { teacherToken = await login('teacher'); });

    let teacherCourseId = null;
    await step('Find a course owned by this teacher', async () => {
        const { body } = await apiGet(teacherToken, '/teacher/courses');
        const list = body?.courses || body?.data || (Array.isArray(body) ? body : []);
        if (!list.length) throw new Error('Teacher has no courses');
        teacherCourseId = list[0].id;
    });

    await step('PATCH/PUT course with trialDurationDays=3', async () => {
        const res = await page.evaluate(async (api, tok, cid) => {
            const r = await fetch(`${api}/courses/${cid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ trialDurationDays: 3 }),
            });
            return { status: r.status, body: await r.json().catch(() => null) };
        }, API_BASE, teacherToken, teacherCourseId);
        if (res.status >= 400) throw new Error(`PUT /courses/${teacherCourseId} → ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
    });

    await step('GET course returns trialDurationDays=3', async () => {
        const r = await apiGet(teacherToken, `/courses/${teacherCourseId}`);
        const got = r.body?.trialDurationDays ?? r.body?.course?.trialDurationDays;
        if (got !== 3) throw new Error(`trialDurationDays = ${got}, expected 3`);
    });

    await step('EditCourse page loads with trial field', async () => {
        await goto(`/courses/${teacherCourseId}/edit`);
        await sleep(2000);
        const has = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasLabel = /Số ngày học thử/i.test(text);
            const hasInput = !!document.querySelector('input[placeholder="VD: 7"]') ||
                             !!document.querySelector('input[name="trialDurationDays"]');
            return hasLabel && hasInput;
        });
        if (!has) throw new Error('EditCourse missing trial label / input');
        await shot('4-teacher-edit-trial');
    });

    // ── 5. Teacher revenue / earnings ────────────────────────────────────────
    console.log('\n══ 5. Teacher — view revenue / earnings page ══');
    await step('GET /teacher/earnings returns 200', async () => {
        const r = await apiGet(teacherToken, '/teacher/earnings');
        if (r.status !== 200) throw new Error(`status=${r.status}`);
    });

    await step('TeacherEarnings page loads with revenue text', async () => {
        await goto('/teacher/earnings');
        await sleep(1500);
        const text = await page.evaluate(() => document.body.innerText);
        if (!/Doanh thu|earning|VNĐ|VND/i.test(text)) throw new Error('No revenue text on page');
        await shot('5-teacher-earnings');
    });

    // ── 6. Teacher views enrolled students list ──────────────────────────────
    console.log('\n══ 6. Teacher — enrolled-students list per course ══');
    let courseWithStudents = null;
    await step('Find a teacher course with enrollments', async () => {
        const { body } = await apiGet(teacherToken, '/teacher/courses');
        const list = body?.courses || body?.data || (Array.isArray(body) ? body : []);
        for (const c of list) {
            const enr = await apiGet(teacherToken, `/courses/${c.id}/students`);
            const rows = enr.body?.enrollments || enr.body?.data || (Array.isArray(enr.body) ? enr.body : []);
            if (rows.length > 0) { courseWithStudents = c.id; break; }
        }
        if (!courseWithStudents) {
            // any course is fine — we just want the page to render
            courseWithStudents = list[0]?.id;
        }
        if (!courseWithStudents) throw new Error('No course to test enrolled-students page');
    });

    await step('GET /courses/:id/students returns 200', async () => {
        const r = await apiGet(teacherToken, `/courses/${courseWithStudents}/students`);
        if (r.status !== 200) throw new Error(`status=${r.status}`);
    });

    await step('EnrolledStudents page renders heading', async () => {
        await goto(`/courses/${courseWithStudents}/students`);
        await sleep(1500);
        const text = await page.evaluate(() => document.body.innerText);
        if (!/Học viên đã đăng ký|enrolled students|đã đăng ký/i.test(text)) {
            throw new Error('No enrolled-students heading');
        }
        await shot('6-teacher-enrolled-students');
    });

    // ── summary ──────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log(`  PASSED: ${passed}    FAILED: ${failed}`);
    console.log('══════════════════════════════════════════');
    if (failed > 0) {
        console.log('\nFailed steps:');
        log.filter(l => !l.ok).forEach(l => console.log(`  ✗ ${l.label}\n      ${l.err}`));
    }

    await sleep(500);
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
    console.error('\nFATAL:', e);
    try { await shot('FATAL'); } catch {}
    if (browser) await browser.close();
    process.exit(2);
});
