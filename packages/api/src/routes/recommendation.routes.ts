import { Router } from 'express';
import { recommendPathController } from '../controllers/recommendation.controller';

const router = Router();

// Public — anyone (anonymous, student, teacher, admin) can ask for a learning path.
router.post('/recommend/path', recommendPathController);

export default router;
