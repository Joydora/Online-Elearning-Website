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

// Admin / Teacher routes
router.get('/promotions', isAuthenticated, isAuthorized([Role.ADMIN, Role.TEACHER]), getAllPromotionsController);
router.get('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN, Role.TEACHER]), getPromotionByIdController);
router.post('/promotions', isAuthenticated, isAuthorized([Role.ADMIN, Role.TEACHER]), createPromotionController);
router.put('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN, Role.TEACHER]), updatePromotionController);
router.delete('/promotions/:id', isAuthenticated, isAuthorized([Role.ADMIN, Role.TEACHER]), deletePromotionController);

export default router;

