import { Request, Response } from 'express';
import {
    getStreakInfo,
    getUserBadges,
    getLeaderboard,
    getUserRank,
    getActivityHeatmap,
    BADGE_DEFINITIONS,
} from '../services/gamification.service';
import { AuthenticatedUser } from '../types/auth';

function auth(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

// GET /gamification/streak
export async function getStreakController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const streak = await getStreakInfo(user.userId);
        return res.status(200).json(streak);
    } catch (error) {
        console.error('[gamification] getStreak failed:', error);
        return res.status(500).json({ error: 'Unable to get streak info' });
    }
}

// GET /gamification/badges
export async function getBadgesController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const badges = await getUserBadges(user.userId);
        return res.status(200).json(badges);
    } catch (error) {
        console.error('[gamification] getBadges failed:', error);
        return res.status(500).json({ error: 'Unable to get badges' });
    }
}

// GET /gamification/badges/:userId
export async function getPublicBadgesController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = Number.parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) return res.status(400).json({ error: 'userId must be a number' });

        const badges = await getUserBadges(userId);
        return res.status(200).json(badges);
    } catch (error) {
        console.error('[gamification] getPublicBadges failed:', error);
        return res.status(500).json({ error: 'Unable to get badges' });
    }
}

// GET /gamification/leaderboard?period=weekly&page=1&limit=20
export async function getLeaderboardController(req: Request, res: Response): Promise<Response> {
    try {
        const period = (req.query.period as string) || 'all-time';
        if (!['weekly', 'monthly', 'all-time'].includes(period)) {
            return res.status(400).json({ error: 'period must be weekly, monthly, or all-time' });
        }

        const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 20));

        const leaderboard = await getLeaderboard(period as 'weekly' | 'monthly' | 'all-time', page, limit);
        return res.status(200).json(leaderboard);
    } catch (error) {
        console.error('[gamification] getLeaderboard failed:', error);
        return res.status(500).json({ error: 'Unable to get leaderboard' });
    }
}

// GET /gamification/rank
export async function getRankController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const rank = await getUserRank(user.userId);
        return res.status(200).json(rank);
    } catch (error) {
        console.error('[gamification] getRank failed:', error);
        return res.status(500).json({ error: 'Unable to get rank' });
    }
}

// GET /gamification/activity-heatmap
export async function getActivityHeatmapController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const days = Math.min(365, Math.max(7, Number.parseInt(req.query.days as string, 10) || 90));
        const heatmap = await getActivityHeatmap(user.userId, days);
        return res.status(200).json(heatmap);
    } catch (error) {
        console.error('[gamification] getActivityHeatmap failed:', error);
        return res.status(500).json({ error: 'Unable to get activity heatmap' });
    }
}

// GET /gamification/badge-definitions
export async function getBadgeDefinitionsController(_req: Request, res: Response): Promise<Response> {
    return res.status(200).json(BADGE_DEFINITIONS);
}
