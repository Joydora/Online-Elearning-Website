import { CourseLevel, PrismaClient } from '@prisma/client';
import { Ollama as OllamaClient } from 'ollama';

const prisma = new PrismaClient();

const ollamaHost = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma3:4b';
const ollama = new OllamaClient({ host: ollamaHost });

export type LearningPathInput = {
    goal: string;
    currentLevel?: CourseLevel | null;
    maxCourses?: number;
};

export type RecommendedCourse = {
    courseId: number;
    title: string;
    level: CourseLevel | null;
    rationale: string;
};

export type LearningPathResult = {
    ordered: RecommendedCourse[];
    generatedBy: 'ai' | 'fallback';
    note?: string;
};

const LEVEL_ORDER: Record<CourseLevel, number> = {
    BEGINNER: 0,
    INTERMEDIATE: 1,
    ADVANCED: 2,
};

type CatalogCourse = {
    id: number;
    title: string;
    description: string;
    level: CourseLevel | null;
    prerequisites: { id: number }[];
};

async function loadCatalog(): Promise<CatalogCourse[]> {
    return prisma.course.findMany({
        select: {
            id: true,
            title: true,
            description: true,
            level: true,
            prerequisites: { select: { id: true } },
        },
    });
}

function buildPrompt(input: LearningPathInput, catalog: CatalogCourse[], maxCourses: number): string {
    const lines: string[] = [];
    lines.push('Bạn là cố vấn học tập. Tạo lộ trình học cho học viên dựa trên mục tiêu của họ và danh sách khoá học hiện có.');
    lines.push('TRẢ LỜI PHẢI LÀ JSON HỢP LỆ, KHÔNG THÊM TEXT NÀO KHÁC.');
    lines.push(`Định dạng: {"ordered":[{"courseId":<int>,"rationale":"<lý do ngắn gọn tiếng Việt>"}, ...]}`);
    lines.push('');
    lines.push(`MỤC TIÊU: ${input.goal}`);
    if (input.currentLevel) {
        lines.push(`TRÌNH ĐỘ HIỆN TẠI: ${input.currentLevel}`);
    }
    lines.push(`SỐ KHOÁ TỐI ĐA TRONG LỘ TRÌNH: ${maxCourses}`);
    lines.push('');
    lines.push('DANH SÁCH KHOÁ HỌC (id | title | level | prerequisites | description):');
    for (const c of catalog) {
        const prereqs = c.prerequisites.length
            ? `[${c.prerequisites.map((p) => p.id).join(',')}]`
            : '[]';
        const desc = c.description.length > 200 ? c.description.slice(0, 200) + '...' : c.description;
        lines.push(`- ${c.id} | ${c.title} | ${c.level ?? 'UNKNOWN'} | ${prereqs} | ${desc}`);
    }
    lines.push('');
    lines.push('QUY TẮC:');
    lines.push('- Chỉ chọn courseId có trong danh sách trên');
    lines.push('- Tôn trọng prerequisites: khoá phải đứng SAU mọi prerequisite của nó');
    lines.push('- Sắp xếp BEGINNER → INTERMEDIATE → ADVANCED khi không trái với prerequisite');
    lines.push('- rationale: 1 câu ngắn giải thích vì sao chọn');
    lines.push('');
    lines.push('JSON:');
    return lines.join('\n');
}

function extractJsonObject(raw: string): unknown | null {
    const start = raw.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; }
            }
        }
    }
    return null;
}

/**
 * Heuristic fallback: order all courses by (level, prerequisite-count).
 * Topologically respects prerequisites — a course only appears after its prereqs.
 */
function fallbackOrdering(
    catalog: CatalogCourse[],
    currentLevel: CourseLevel | null | undefined,
    maxCourses: number,
): RecommendedCourse[] {
    // Filter out courses below the user's current level.
    const minRank = currentLevel ? LEVEL_ORDER[currentLevel] : -1;
    const eligible = catalog.filter((c) => {
        if (!c.level) return true; // unknown — let through
        return LEVEL_ORDER[c.level] >= minRank;
    });

    // Topological sort: emit a course only after all its prereq ids have been emitted.
    const emitted = new Set<number>();
    const result: CatalogCourse[] = [];
    const eligibleIds = new Set(eligible.map((c) => c.id));

    // Sort candidates by level then by prereq-count so simpler courses come first.
    const sorted = [...eligible].sort((a, b) => {
        const la = a.level ? LEVEL_ORDER[a.level] : -1;
        const lb = b.level ? LEVEL_ORDER[b.level] : -1;
        if (la !== lb) return la - lb;
        return a.prerequisites.length - b.prerequisites.length;
    });

    let progress = true;
    while (progress && result.length < maxCourses) {
        progress = false;
        for (const c of sorted) {
            if (emitted.has(c.id)) continue;
            const allPrereqsReady = c.prerequisites.every(
                (p) => emitted.has(p.id) || !eligibleIds.has(p.id),
            );
            if (allPrereqsReady) {
                emitted.add(c.id);
                result.push(c);
                progress = true;
                if (result.length >= maxCourses) break;
            }
        }
    }

    return result.map((c) => ({
        courseId: c.id,
        title: c.title,
        level: c.level,
        rationale:
            'Sắp xếp theo trình độ và prerequisite (AI không khả dụng nên dùng heuristic).',
    }));
}

export async function recommendLearningPath(
    input: LearningPathInput,
): Promise<LearningPathResult> {
    const maxCourses = Math.min(Math.max(input.maxCourses ?? 5, 1), 10);

    const catalog = await loadCatalog();
    if (catalog.length === 0) {
        return { ordered: [], generatedBy: 'fallback', note: 'Hệ thống chưa có khoá học nào.' };
    }

    if (!input.goal || !input.goal.trim()) {
        return {
            ordered: fallbackOrdering(catalog, input.currentLevel, maxCourses),
            generatedBy: 'fallback',
            note: 'Không có mục tiêu — sắp xếp theo trình độ.',
        };
    }

    const prompt = buildPrompt(input, catalog, maxCourses);
    try {
        const response = await ollama.generate({
            model: ollamaModel,
            prompt,
            stream: false,
        });
        const parsed = extractJsonObject(response.response) as
            | { ordered?: Array<{ courseId?: unknown; rationale?: unknown }> }
            | null;

        if (!parsed || !Array.isArray(parsed.ordered)) {
            return {
                ordered: fallbackOrdering(catalog, input.currentLevel, maxCourses),
                generatedBy: 'fallback',
                note: 'AI trả về phản hồi không hợp lệ, dùng heuristic.',
            };
        }

        const byId = new Map(catalog.map((c) => [c.id, c]));
        const seen = new Set<number>();
        const ordered: RecommendedCourse[] = [];
        for (const row of parsed.ordered) {
            const id = Number(row.courseId);
            if (!Number.isInteger(id) || !byId.has(id) || seen.has(id)) continue;
            seen.add(id);
            const course = byId.get(id)!;
            const rationale =
                typeof row.rationale === 'string' && row.rationale.trim()
                    ? row.rationale.trim()
                    : 'Phù hợp với mục tiêu của bạn.';
            ordered.push({
                courseId: course.id,
                title: course.title,
                level: course.level,
                rationale,
            });
            if (ordered.length >= maxCourses) break;
        }

        if (ordered.length === 0) {
            return {
                ordered: fallbackOrdering(catalog, input.currentLevel, maxCourses),
                generatedBy: 'fallback',
                note: 'AI không chọn được khoá nào, dùng heuristic.',
            };
        }

        return { ordered, generatedBy: 'ai' };
    } catch (err) {
        return {
            ordered: fallbackOrdering(catalog, input.currentLevel, maxCourses),
            generatedBy: 'fallback',
            note: `AI không khả dụng (${(err as Error).message}). Dùng heuristic.`,
        };
    }
}
