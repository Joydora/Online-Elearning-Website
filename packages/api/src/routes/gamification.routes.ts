import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import {
    getStreakController,
    getBadgesController,
    getPublicBadgesController,
    getLeaderboardController,
    getRankController,
    getActivityHeatmapController,
    getBadgeDefinitionsController,
} from '../controllers/gamification.controller';

const router = Router();

// Public
router.get('/gamification/badge-definitions', getBadgeDefinitionsController);
router.get('/gamification/leaderboard', getLeaderboardController);
router.get('/gamification/badges/:userId', getPublicBadgesController);

// Authenticated (any role)
router.get('/gamification/streak', isAuthenticated, getStreakController);
router.get('/gamification/badges', isAuthenticated, getBadgesController);
router.get('/gamification/rank', isAuthenticated, getRankController);
router.get('/gamification/activity-heatmap', isAuthenticated, getActivityHeatmapController);

export default router;
