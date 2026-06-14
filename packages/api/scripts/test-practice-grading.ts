import 'dotenv/config';
import { gradePractice } from '../src/services/practice.service';

async function run(label: string, input: Parameters<typeof gradePractice>[0]) {
    console.log(`\n--- ${label} ---`);
    const start = Date.now();
    const result = await gradePractice(input);
    const ms = Date.now() - start;
    console.log(`   ${ms}ms | score=${result.score} | feedback="${result.feedback.slice(0, 200)}"`);
    const shapeOk =
        (result.score === null || (typeof result.score === 'number' && result.score >= 0 && result.score <= 10)) &&
        typeof result.feedback === 'string' &&
        result.feedback.length > 0;
    console.log(`   ${shapeOk ? '✅' : '❌'} result shape valid`);
    return result;
}

async function main() {
    // 1. Empty code → short-circuit, score 0, no Ollama call
    const empty = await run('empty submission', {
        prompt: 'Viết hàm cộng hai số.',
        studentCode: '',
    });
    console.log(`   ${empty.score === 0 ? '✅' : '❌'} empty code → score 0 without calling AI`);

    // 2. Real code — goes to Ollama
    await run('plausible JS solution', {
        prompt: 'Viết hàm JavaScript cộng hai số.',
        studentCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        expectedOutput: 'add(2, 3) === 5',
    });

    // 3. Obviously wrong code — should get lower score
    await run('wrong solution', {
        prompt: 'Viết hàm JavaScript cộng hai số.',
        studentCode: 'console.log("hello");',
        language: 'javascript',
    });

    // 4. Force AI-unreachable path by pointing OLLAMA_HOST at a bad port
    process.env.OLLAMA_HOST = 'http://127.0.0.1:59999';
    // Re-require the service so it picks up the env change
    delete require.cache[require.resolve('../src/services/practice.service')];
    const reloaded = await import('../src/services/practice.service');
    const unreachable = await reloaded.gradePractice({
        prompt: 'test',
        studentCode: 'x = 1',
    });
    console.log(`\n--- unreachable Ollama ---`);
    console.log(`   score=${unreachable.score} | feedback="${unreachable.feedback.slice(0, 200)}"`);
    console.log(
        `   ${unreachable.score === null && unreachable.feedback.includes('unavailable') ? '✅' : '❌'} graceful fallback when Ollama unreachable`,
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
