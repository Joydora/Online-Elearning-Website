import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import { recommendPathController } from '../controllers/recommend.controller';

const router = Router();

// Optional auth: logged-in students get enrolled courses excluded from results
router.post('/recommend/path', optionalAuth, recommendPathController);

export default router;
