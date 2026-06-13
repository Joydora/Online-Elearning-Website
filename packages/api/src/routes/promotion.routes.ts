import { Router } from 'express';
import { Role } from '@prisma/client';
import {
    getAllPromotionsController,
    getPromotionByIdController,
    validatePromotionCodeController,
    createPromotionController,
    updatePromotionController,
    deletePromotionController,
} from '../controllers/promotion.controller';
import { isAuthenticated, isAuthorized, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public route - Validate promotion code (for checkout)
router.post('/promotions/validate', optionalAuth, validatePromotionCodeController);

// Admin routes
router.get('/promotions', isAuthenticated, isAuthorized([Role.ADMIN]), getAllPromotionsController);
router.get('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN]), getPromotionByIdController);
router.post('/promotions', isAuthenticated, isAuthorized([Role.ADMIN]), createPromotionController);
router.put('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN]), updatePromotionController);
router.delete('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN]), deletePromotionController);

export default router;

