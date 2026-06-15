import { PrismaClient, CourseLevel } from '@prisma/client';
import { embeddingService } from './embedding.service';

const prisma = new PrismaClient();

const LEVEL_ORDER: Record<CourseLevel, number> = {
    BEGINNER: 0,
    INTERMEDIATE: 1,
    ADVANCED: 2,
};

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const SYNONYMS: Record<string, string[]> = {
    'anh': ['english', 'grammar', 'ielts', 'toeic', 'toefl', 'esl'],
    'english': ['anh', 'tieng anh'],
    'tieng': ['english'],
    'python': ['python', 'py'],
    'react': ['react', 'js', 'jsx', 'frontend'],
    'typescript': ['typescript', 'ts'],
    'javascript': ['javascript', 'js'],
    'js': ['javascript', 'js'],
    'html': ['html', 'css', 'web'],
    'css': ['html', 'css', 'web'],
    'sql': ['sql', 'postgres', 'postgresql', 'database', 'db'],
    'database': ['sql', 'postgres', 'postgresql', 'database', 'db'],
    'db': ['sql', 'postgres', 'postgresql', 'database', 'db'],
    'toan': ['calculus', 'math', 'algebra', 'linear'],
    'math': ['toan', 'calculus', 'algebra', 'linear'],
    'calculus': ['toan', 'calculus', 'math'],
    'algebra': ['toan', 'algebra', 'linear', 'math'],
    'thuat': ['algorithm', 'algorithms', 'structure', 'structures'],
    'toan_thuat': ['algorithm', 'algorithms', 'structure', 'structures'],
    'test': ['test', 'testing', 'qa'],
    'testing': ['test', 'testing', 'qa'],
    'developer': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
    'developers': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
    'dev': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
    'devs': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
    'coder': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
    'programmer': ['dev', 'devs', 'developer', 'developers', 'coder', 'coders', 'programmer', 'programmers', 'develop', 'development', 'programming', 'software', 'web', 'code', 'coding'],
};

const STOP_WORDS = new Set([
    'hoc', 'khoa', 'toi', 'muon', 'can', 'cho', 'va', 'la', 'co', 'de',
    'i', 'want', 'to', 'learn', 'course', 'courses', 'and', 'the', 'a', 'in', 'of', 'become'
]);

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ');
}

function getKeywordScore(goal: string, title: string, description: string): number {
    const goalNorm = normalizeText(goal);
    const courseNorm = normalizeText(`${title} ${description}`);

    const goalTokens = goalNorm.split(/\s+/).filter(t => t && !STOP_WORDS.has(t));
    const courseTokens = courseNorm.split(/\s+/).filter(Boolean);
    const courseSet = new Set(courseTokens);

    if (goalTokens.length === 0) return 1.0;

    const expandedGoalSet = new Set<string>();
    for (const token of goalTokens) {
        expandedGoalSet.add(token);
        if (SYNONYMS[token]) {
            for (const syn of SYNONYMS[token]) {
                expandedGoalSet.add(syn);
            }
        }
    }

    if (goalNorm.includes('thuat toan')) {
        expandedGoalSet.add('algorithm');
        expandedGoalSet.add('algorithms');
        expandedGoalSet.add('structure');
        expandedGoalSet.add('structures');
    }
    if (goalNorm.includes('tieng anh') || goalNorm.includes('anh van')) {
        expandedGoalSet.add('english');
        expandedGoalSet.add('grammar');
    }

    let matches = 0;
    for (const token of expandedGoalSet) {
        if (courseSet.has(token)) {
            matches++;
        }
    }

    return matches > 0 ? matches / expandedGoalSet.size : 0;
}

export async function recommendLearningPath(options: {
    goal: string;
    currentLevel: CourseLevel;
    studentId?: number;
}): Promise<{
    courses: Array<{
        id: number;
        title: string;
        description: string;
        level: CourseLevel | null;
        price: number;
        thumbnailUrl: string | null;
        teacher: { username: string; firstName: string | null; lastName: string | null };
        category: { name: string };
        score: number;
    }>;
}> {
    const { goal, currentLevel, studentId } = options;

    // Get all courses with their details
    const allCourses = await prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        select: {
            id: true,
            title: true,
            description: true,
            level: true,
            price: true,
            thumbnailUrl: true,
            teacher: { select: { username: true, firstName: true, lastName: true } },
            category: { select: { name: true } },
            prerequisites: { select: { id: true } },
        },
    });

    // Get student's enrolled courses to exclude them
    let enrolledIds = new Set<number>();
    if (studentId) {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, isActive: true },
            select: { courseId: true },
        });
        enrolledIds = new Set(enrollments.map((e) => e.courseId));
    }

    // Embed the goal
    let goalEmbedding: number[] | null = null;
    try {
        goalEmbedding = await embeddingService.generateEmbedding(goal);
    } catch {
        // Fall back to keyword matching if embedding unavailable
    }

    const currentLevelOrder = LEVEL_ORDER[currentLevel];

    const scored = await Promise.all(
        allCourses
            .filter((c) => !enrolledIds.has(c.id))
            .map(async (course) => {
                let embeddingScore = 0;

                if (goalEmbedding) {
                    try {
                        const courseText = `${course.title} ${course.description}`;
                        const courseEmbedding = await embeddingService.generateEmbedding(courseText);
                        embeddingScore = cosineSimilarity(goalEmbedding, courseEmbedding);
                    } catch {
                        // ignore and default to 0, since we will check keywordScore
                    }
                }

                const keywordScore = getKeywordScore(goal, course.title, course.description);

                // If lexical match score is 0, relevance is 0
                const relevanceScore = keywordScore > 0 ? (embeddingScore * 0.4 + keywordScore * 0.6) : 0;

                // Level suitability: prefer courses at or just above current level
                const courseLevelOrder = course.level ? LEVEL_ORDER[course.level] : 1;
                const levelDiff = courseLevelOrder - currentLevelOrder;
                const levelScore = levelDiff >= 0 && levelDiff <= 1 ? 1 : Math.max(0, 1 - Math.abs(levelDiff) * 0.4);

                const totalScore = relevanceScore * 0.7 + levelScore * 0.3;

                return { ...course, score: totalScore, relevanceScore };
            }),
    );

    // Only allow courses with non-zero relevance score
    const filtered = scored.filter((c) => c.relevanceScore > 0);

    // Build sequence that respects prerequisites as much as possible.
    // We prioritize available courses by level first, then recommendation score.
    const remaining = new Map(filtered.map((course) => [course.id, course]));
    const selected = new Set<number>();
    const sequence: typeof filtered = [];

    while (remaining.size > 0 && sequence.length < 10) {
        const available = Array.from(remaining.values())
            .filter((course) => {
                const prerequisiteIds = course.prerequisites.map((p) => p.id);
                return prerequisiteIds.every((id) => !remaining.has(id) || selected.has(id));
            })
            .sort((a, b) => {
                const aLevel = a.level ? LEVEL_ORDER[a.level] : 1;
                const bLevel = b.level ? LEVEL_ORDER[b.level] : 1;
                if (aLevel !== bLevel) return aLevel - bLevel;
                return b.score - a.score;
            });

        if (available.length === 0) {
            // Cycle or unsatisfied external prerequisite: fallback by level + score.
            const fallback = Array.from(remaining.values()).sort((a, b) => {
                const aLevel = a.level ? LEVEL_ORDER[a.level] : 1;
                const bLevel = b.level ? LEVEL_ORDER[b.level] : 1;
                if (aLevel !== bLevel) return aLevel - bLevel;
                return b.score - a.score;
            })[0];

            sequence.push(fallback);
            selected.add(fallback.id);
            remaining.delete(fallback.id);
            continue;
        }

        const nextCourse = available[0];
        sequence.push(nextCourse);
        selected.add(nextCourse.id);
        remaining.delete(nextCourse.id);
    }

    return { courses: sequence };
}
