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
                        // keyword fallback
                        const goalWords = goal.toLowerCase().split(/\s+/);
                        const courseText = `${course.title} ${course.description}`.toLowerCase();
                        const matches = goalWords.filter((w) => courseText.includes(w)).length;
                        embeddingScore = matches / Math.max(goalWords.length, 1);
                    }
                } else {
                    const goalWords = goal.toLowerCase().split(/\s+/);
                    const courseText = `${course.title} ${course.description}`.toLowerCase();
                    const matches = goalWords.filter((w) => courseText.includes(w)).length;
                    embeddingScore = matches / Math.max(goalWords.length, 1);
                }

                // Level suitability: prefer courses at or just above current level
                const courseLevelOrder = course.level ? LEVEL_ORDER[course.level] : 1;
                const levelDiff = courseLevelOrder - currentLevelOrder;
                // Penalize courses too far below current level, reward courses just above
                const levelScore = levelDiff >= 0 && levelDiff <= 1 ? 1 : Math.max(0, 1 - Math.abs(levelDiff) * 0.4);

                const totalScore = embeddingScore * 0.7 + levelScore * 0.3;

                return { ...course, score: totalScore };
            }),
    );

    // Sort by score descending, group by level
    const sorted = scored
        .filter((c) => c.score > 0.1)
        .sort((a, b) => {
            // Primary: level order (beginner first)
            const aLevel = a.level ? LEVEL_ORDER[a.level] : 1;
            const bLevel = b.level ? LEVEL_ORDER[b.level] : 1;
            if (aLevel !== bLevel) return aLevel - bLevel;
            // Secondary: score descending
            return b.score - a.score;
        })
        .slice(0, 10);

    return { courses: sorted };
}
