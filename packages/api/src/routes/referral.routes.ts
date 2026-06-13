import { Router } from 'express';
import { getMyReferralsController } from '../controllers/referral.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

// Retrieve current user's referral info, referred friends list, and earned coupons
router.get('/users/referrals', isAuthenticated, getMyReferralsController);

export default router;
