import { Ollama } from 'ollama';

const ollamaHost = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma3:4b';

const ollama = new Ollama({ host: ollamaHost });

export type GradeInput = {
    prompt: string;
    studentCode: string;
    expectedOutput?: string | null;
    language?: string | null;
};

export type GradeResult = {
    score: number | null; // 0..10, null if AI unreachable/unusable
    feedback: string;
};

function buildGradingPrompt(input: GradeInput): string {
    const language = input.language ?? 'plaintext';
    const parts: string[] = [];

    parts.push('Bạn là một giảng viên lập trình, chấm điểm bài thực hành của học viên.');
    parts.push('TRẢ LỜI PHẢI LÀ JSON HỢP LỆ, KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC.');
    parts.push('Định dạng: {"score": <số nguyên từ 0 đến 10>, "feedback": "<nhận xét ngắn gọn bằng tiếng Việt>"}');
    parts.push('');
    parts.push(`ĐỀ BÀI:\n${input.prompt}`);
    if (input.expectedOutput && input.expectedOutput.trim()) {
        parts.push('');
        parts.push(`KẾT QUẢ MONG MUỐN:\n${input.expectedOutput}`);
    }
    parts.push('');
    parts.push(`NGÔN NGỮ: ${language}`);
    parts.push('');
    parts.push(`CODE CỦA HỌC VIÊN:\n\`\`\`${language}\n${input.studentCode}\n\`\`\``);
    parts.push('');
    parts.push('CHẤM ĐIỂM THEO TIÊU CHÍ:');
    parts.push('- Đúng yêu cầu đề bài: trọng số lớn nhất');
    parts.push('- Cho điểm 0 nếu code rỗng hoặc hoàn toàn không liên quan');
    parts.push('- Cho điểm 10 nếu code đúng, rõ ràng, có xử lý edge case');
    parts.push('');
    parts.push('JSON:');

    return parts.join('\n');
}

/**
 * Extracts the first {...} JSON object from a string, tolerating surrounding text.
 * Returns null if nothing parseable is found.
 */
function extractJsonObject(raw: string): unknown | null {
    const start = raw.indexOf('{');
    if (start === -1) return null;

    // Walk forward and count braces so we stop at the matching close.
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (ch === '\\') {
            escape = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                try {
                    return JSON.parse(raw.slice(start, i + 1));
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

function clampScore(value: unknown): number | null {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return 0;
    if (n > 10) return 10;
    return Math.round(n * 10) / 10; // 1-decimal precision
}

/**
 * Grade a practice submission via Ollama. Graceful fallback if the LLM is
 * unreachable or returns garbage — caller still gets a valid GradeResult
 * with score=null so the submission can be persisted.
 */
export async function gradePractice(input: GradeInput): Promise<GradeResult> {
    if (!input.studentCode || !input.studentCode.trim()) {
        return { score: 0, feedback: 'Bài nộp trống.' };
    }

    const promptText = buildGradingPrompt(input);

    try {
        const response = await ollama.generate({
            model: ollamaModel,
            prompt: promptText,
            stream: false,
        });

        const parsed = extractJsonObject(response.response) as
            | { score?: unknown; feedback?: unknown }
            | null;

        if (!parsed) {
            return {
                score: null,
                feedback: `Không phân tích được phản hồi AI. Raw: ${response.response.slice(0, 200)}`,
            };
        }

        const score = clampScore(parsed.score);
        const feedback =
            typeof parsed.feedback === 'string' && parsed.feedback.trim()
                ? parsed.feedback.trim()
                : 'AI không cung cấp nhận xét chi tiết.';

        return { score, feedback };
    } catch (error) {
        const msg = (error as Error).message ?? 'unknown';
        return {
            score: null,
            feedback: `AI grading unavailable (${msg}). Bài nộp đã được lưu, giảng viên sẽ chấm tay.`,
        };
    }
}
