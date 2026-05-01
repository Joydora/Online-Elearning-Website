import { PrismaClient } from '@prisma/client';
import { Ollama } from 'ollama';

const prisma = new PrismaClient();
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

export async function getPracticeByContent(contentId: number) {
    return prisma.practice.findUnique({
        where: { contentId },
    });
}

export async function createPractice(data: {
    contentId: number;
    prompt: string;
    starterCode?: string;
    expectedOutput?: string;
    rubric?: string;
    language?: string;
}) {
    return prisma.practice.create({
        data: {
            contentId: data.contentId,
            prompt: data.prompt,
            starterCode: data.starterCode,
            expectedOutput: data.expectedOutput,
            rubric: data.rubric,
            language: data.language ?? 'javascript',
        },
    });
}

export async function updatePractice(id: number, data: {
    prompt?: string;
    starterCode?: string;
    expectedOutput?: string;
    rubric?: string;
    language?: string;
}) {
    return prisma.practice.update({ where: { id }, data });
}

export async function submitPractice(options: {
    practiceId: number;
    studentId: number;
    submittedCode: string;
}) {
    const { practiceId, studentId, submittedCode } = options;

    const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        include: { content: { include: { module: { select: { courseId: true } } } } },
    });
    if (!practice) throw new Error('PRACTICE_NOT_FOUND');

    const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, courseId: practice.content.module.courseId, isActive: true },
    });
    if (!enrollment) throw new Error('NOT_ENROLLED');

    // AI grading via Ollama
    let aiFeedback = '';
    let score = 0;
    let passed = false;

    try {
        const systemPrompt = `You are a programming tutor grading student code submissions.
Evaluate the code objectively and return JSON with this exact structure:
{
  "score": <number 0-100>,
  "passed": <boolean, true if score >= 60>,
  "feedback": "<concise feedback in Vietnamese explaining what is correct and what needs improvement>"
}`;

        const userPrompt = `Practice Task: ${practice.prompt}
${practice.expectedOutput ? `Expected Output: ${practice.expectedOutput}` : ''}
${practice.rubric ? `Rubric: ${practice.rubric}` : ''}

Student Code (${practice.language}):
\`\`\`${practice.language}
${submittedCode}
\`\`\`

Grade this submission and return only valid JSON.`;

        const response = await ollama.chat({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            options: { temperature: 0.1 },
        });

        const raw = response.message.content.trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
            passed = parsed.passed === true || parsed.passed === 'true' || score >= 60;
            aiFeedback = String(parsed.feedback || '');
        }
    } catch {
        score = 0;
        passed = false;
        aiFeedback = 'AI grading không khả dụng. Code của bạn đã được ghi nhận, hãy thử lại sau để nhận phản hồi chi tiết.';
    }

    const submission = await prisma.practiceSubmission.create({
        data: {
            practiceId,
            studentId,
            submittedCode,
            aiFeedback,
            score,
            passed,
        },
    });

    return submission;
}

export async function getMySubmissions(practiceId: number, studentId: number) {
    return prisma.practiceSubmission.findMany({
        where: { practiceId, studentId },
        orderBy: { submittedAt: 'desc' },
        take: 10,
    });
}
