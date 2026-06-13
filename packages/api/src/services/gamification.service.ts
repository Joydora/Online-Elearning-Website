import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── XP Configuration ────────────────────────────────────────────
const XP_REWARDS: Record<string, number> = {
    VIDEO_COMPLETED: 10,
    DOCUMENT_COMPLETED: 8,
    QUIZ_COMPLETED: 20,
    QUIZ_PERFECT: 30,       // bonus for 100%
    PRACTICE_COMPLETED: 25,
    ASSIGNMENT_COMPLETED: 30,
    COURSE_COMPLETED: 100,
};

function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.0;
    if (streak >= 14) return 1.75;
    if (streak >= 7) return 1.5;
    if (streak >= 3) return 1.25;
    return 1.0;
}

// ─── Badge Definitions ───────────────────────────────────────────
export type BadgeDefinition = {
    type: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isGlobal: boolean; // true = global, false = per-course
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // Global badges
    { type: 'FIRST_LESSON', name: 'First Step', description: 'Complete your very first lesson', icon: '🌱', rarity: 'common', isGlobal: true },
    { type: 'STREAK_3', name: 'Getting Warm', description: 'Maintain a 3-day learning streak', icon: '🔥', rarity: 'common', isGlobal: true },
    { type: 'STREAK_7', name: 'On Fire', description: 'Maintain a 7-day learning streak', icon: '🔥', rarity: 'rare', isGlobal: true },
    { type: 'STREAK_30', name: 'Unstoppable', description: 'Maintain a 30-day learning streak', icon: '💎', rarity: 'legendary', isGlobal: true },
    { type: 'COURSE_MASTER', name: 'Course Master', description: 'Complete 5 courses', icon: '👑', rarity: 'epic', isGlobal: true },
    { type: 'QUIZ_MASTER', name: 'Quiz Master', description: 'Score 90%+ on 10 quizzes', icon: '🏆', rarity: 'epic', isGlobal: true },
    { type: 'XP_100', name: 'Rising Star', description: 'Earn 100 XP', icon: '💫', rarity: 'common', isGlobal: true },
    { type: 'XP_500', name: 'Powerhouse', description: 'Earn 500 XP', icon: '⚡', rarity: 'rare', isGlobal: true },
    { type: 'XP_1000', name: 'Legend', description: 'Earn 1,000 XP', icon: '🚀', rarity: 'epic', isGlobal: true },
    { type: 'XP_5000', name: 'Transcendent', description: 'Earn 5,000 XP', icon: '🌟', rarity: 'legendary', isGlobal: true },
    { type: 'EARLY_BIRD', name: 'Early Bird', description: 'Complete a lesson before 8 AM', icon: '🌅', rarity: 'rare', isGlobal: true },

    // Per-course badges
    { type: 'COURSE_COMPLETE', name: 'Graduate', description: 'Complete this course', icon: '🎓', rarity: 'rare', isGlobal: false },
    { type: 'QUIZ_ACE', name: 'Perfect Score', description: 'Score 100% on a quiz in this course', icon: '⭐', rarity: 'rare', isGlobal: false },
];

// ─── Core: Record Activity ──────────────────────────────────────
export async function recordActivity(
    userId: number,
    action: string,
    xpBase: number,
    metadata?: Record<string, unknown>,
): Promise<{ xpEarned: number; newBadges: string[]; streak: number }> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Upsert streak record
    let streak = await prisma.learningStreak.upsert({
        where: { userId },
        create: { userId, currentStreak: 0, longestStreak: 0, totalXp: 0 },
        update: {},
    });

    // 2. Calculate streak
    const lastDate = streak.lastActivityDate
        ? streak.lastActivityDate.toISOString().slice(0, 10)
        : null;

    let newCurrentStreak = streak.currentStreak;
    if (lastDate === todayStr) {
        // Already active today, no streak change
    } else {
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (lastDate === yesterdayStr) {
            newCurrentStreak = streak.currentStreak + 1;
        } else {
            newCurrentStreak = 1; // streak broken, restart
        }
    }

    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

    // 3. Calculate XP with streak multiplier
    const multiplier = getStreakMultiplier(newCurrentStreak);
    const xpEarned = Math.round(xpBase * multiplier);
    const newTotalXp = streak.totalXp + xpEarned;

    // 4. Update streak
    streak = await prisma.learningStreak.update({
        where: { userId },
        data: {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            lastActivityDate: now,
            totalXp: newTotalXp,
        },
    });

    // 5. Log activity
    await prisma.activityLog.create({
        data: { userId, action, xpEarned, metadata: metadata as object, date: now },
    });

    // 6. Check & award badges
    const newBadges = await checkAndAwardBadges(userId, action, metadata);

    return { xpEarned, newBadges, streak: newCurrentStreak };
}

// ─── Badge Checking ─────────────────────────────────────────────
async function checkAndAwardBadges(
    userId: number,
    action: string,
    metadata?: Record<string, unknown>,
): Promise<string[]> {
    const awarded: string[] = [];

    const streak = await prisma.learningStreak.findUnique({ where: { userId } });
    if (!streak) return awarded;

    const existingBadges = await prisma.badge.findMany({
        where: { userId },
        select: { badgeType: true, courseId: true },
    });
    const hasBadge = (type: string, courseId?: number | null) =>
        existingBadges.some((b) => b.badgeType === type && b.courseId === (courseId ?? null));

    const tryAward = async (type: string, courseId?: number | null) => {
        if (hasBadge(type, courseId)) return false;
        await prisma.badge.create({
            data: {
                userId,
                badgeType: type,
                courseId: courseId ?? null,
                metadata: { action },
            },
        });
        awarded.push(type);
        return true;
    };

    // Global badges — FIRST_LESSON
    if (action === 'CONTENT_COMPLETED') {
        const totalCompleted = await prisma.activityLog.count({
            where: { userId, action: 'CONTENT_COMPLETED' },
        });
        if (totalCompleted === 1) await tryAward('FIRST_LESSON');
    }

    // Streak badges
    if (streak.currentStreak >= 3) await tryAward('STREAK_3');
    if (streak.currentStreak >= 7) await tryAward('STREAK_7');
    if (streak.currentStreak >= 30) await tryAward('STREAK_30');

    // XP badges
    if (streak.totalXp >= 100) await tryAward('XP_100');
    if (streak.totalXp >= 500) await tryAward('XP_500');
    if (streak.totalXp >= 1000) await tryAward('XP_1000');
    if (streak.totalXp >= 5000) await tryAward('XP_5000');

    // Course completion badges
    if (action === 'COURSE_COMPLETED' && metadata?.courseId) {
        const courseId = metadata.courseId as number;
        await tryAward('COURSE_COMPLETE', courseId);

        // COURSE_MASTER: completed 5+ courses
        const completedCourses = await prisma.badge.count({
            where: { userId, badgeType: 'COURSE_COMPLETE' },
        });
        if (completedCourses >= 5) await tryAward('COURSE_MASTER');
    }

    // Quiz badges
    if (action === 'QUIZ_PASSED') {
        const score = (metadata?.score as number) ?? 0;
        const courseId = (metadata?.courseId as number) ?? undefined;

        if (score >= 100 && courseId) {
            await tryAward('QUIZ_ACE', courseId);
        }

        // QUIZ_MASTER: 10 quizzes with 90%+
        const highScoreQuizzes = await prisma.activityLog.count({
            where: {
                userId,
                action: 'QUIZ_PASSED',
                metadata: { path: ['score'], gte: 90 },
            },
        });
        if (highScoreQuizzes >= 10) await tryAward('QUIZ_MASTER');
    }

    // Early Bird
    const hour = new Date().getUTCHours();
    if (hour < 8 && action === 'CONTENT_COMPLETED') {
        await tryAward('EARLY_BIRD');
    }

    return awarded;
}

// ─── Get Streak Info ─────────────────────────────────────────────
export async function getStreakInfo(userId: number) {
    let streak = await prisma.learningStreak.findUnique({ where: { userId } });

    if (!streak) {
        streak = await prisma.learningStreak.create({
            data: { userId, currentStreak: 0, longestStreak: 0, totalXp: 0 },
        });
    }

    // Check if streak is still valid (not broken)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastDate = streak.lastActivityDate
        ? streak.lastActivityDate.toISOString().slice(0, 10)
        : null;

    let displayStreak = streak.currentStreak;
    if (lastDate && lastDate !== todayStr) {
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        if (lastDate !== yesterdayStr) {
            // Streak is broken but not yet updated in DB
            displayStreak = 0;
        }
    }

    return {
        currentStreak: displayStreak,
        longestStreak: streak.longestStreak,
        totalXp: streak.totalXp,
        lastActivityDate: streak.lastActivityDate,
        multiplier: getStreakMultiplier(displayStreak),
    };
}

// ─── Get Activity Heatmap ────────────────────────────────────────
export async function getActivityHeatmap(userId: number, days: number = 90) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const activities = await prisma.activityLog.findMany({
        where: { userId, date: { gte: since } },
        select: { date: true, xpEarned: true },
        orderBy: { date: 'asc' },
    });

    // Group by date
    const heatmap: Record<string, { count: number; xp: number }> = {};
    for (const a of activities) {
        const dateStr = a.date.toISOString().slice(0, 10);
        if (!heatmap[dateStr]) heatmap[dateStr] = { count: 0, xp: 0 };
        heatmap[dateStr].count += 1;
        heatmap[dateStr].xp += a.xpEarned;
    }

    return heatmap;
}

// ─── Get User Badges ─────────────────────────────────────────────
export async function getUserBadges(userId: number) {
    const earned = await prisma.badge.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
    });

    return BADGE_DEFINITIONS.map((def) => {
        const match = earned.find((b) => b.badgeType === def.type && (def.isGlobal || b.courseId !== null));
        return {
            ...def,
            earned: !!match,
            earnedAt: match?.earnedAt ?? null,
            courseId: match?.courseId ?? null,
            // For per-course badges, return all earned instances
            instances: def.isGlobal
                ? undefined
                : earned.filter((b) => b.badgeType === def.type).map((b) => ({
                    courseId: b.courseId,
                    earnedAt: b.earnedAt,
                    metadata: b.metadata,
                })),
        };
    });
}

// ─── Leaderboard ─────────────────────────────────────────────────
export async function getLeaderboard(
    period: 'weekly' | 'monthly' | 'all-time' = 'all-time',
    page: number = 1,
    limit: number = 20,
) {
    const offset = (page - 1) * limit;

    if (period === 'all-time') {
        // Fast path: use cached totalXp on LearningStreak
        const [entries, total] = await Promise.all([
            prisma.learningStreak.findMany({
                orderBy: { totalXp: 'desc' },
                skip: offset,
                take: limit,
                include: {
                    user: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                },
            }),
            prisma.learningStreak.count(),
        ]);

        return {
            entries: entries.map((e, i) => ({
                rank: offset + i + 1,
                userId: e.userId,
                username: e.user.username,
                displayName: [e.user.firstName, e.user.lastName].filter(Boolean).join(' ') || e.user.username,
                totalXp: e.totalXp,
                currentStreak: e.currentStreak,
                longestStreak: e.longestStreak,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Weekly or monthly: aggregate from ActivityLog
    const since = new Date();
    if (period === 'weekly') {
        since.setUTCDate(since.getUTCDate() - 7);
    } else {
        since.setUTCDate(since.getUTCDate() - 30);
    }

    // Use raw query for efficient aggregation
    const aggregated = await prisma.activityLog.groupBy({
        by: ['userId'],
        where: { date: { gte: since } },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: 'desc' } },
        skip: offset,
        take: limit,
    });

    const totalCount = await prisma.activityLog.groupBy({
        by: ['userId'],
        where: { date: { gte: since } },
    });

    const userIds = aggregated.map((a) => a.userId);
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const streaks = await prisma.learningStreak.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, currentStreak: true, longestStreak: true },
    });
    const streakMap = new Map(streaks.map((s) => [s.userId, s]));

    return {
        entries: aggregated.map((a, i) => {
            const user = userMap.get(a.userId);
            const streak = streakMap.get(a.userId);
            return {
                rank: offset + i + 1,
                userId: a.userId,
                username: user?.username ?? 'Unknown',
                displayName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Unknown',
                totalXp: a._sum.xpEarned ?? 0,
                currentStreak: streak?.currentStreak ?? 0,
                longestStreak: streak?.longestStreak ?? 0,
            };
        }),
        total: totalCount.length,
        page,
        limit,
        totalPages: Math.ceil(totalCount.length / limit),
    };
}

// ─── Get User Rank ───────────────────────────────────────────────
export async function getUserRank(userId: number) {
    const streak = await prisma.learningStreak.findUnique({ where: { userId } });
    if (!streak) return { rank: null, totalXp: 0, totalPlayers: 0 };

    const rank = await prisma.learningStreak.count({
        where: { totalXp: { gt: streak.totalXp } },
    });

    const totalPlayers = await prisma.learningStreak.count();

    return {
        rank: rank + 1,
        totalXp: streak.totalXp,
        totalPlayers,
    };
}
