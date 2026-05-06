import { Router } from 'express';
import { createDiscussionPostController, getCourseDiscussionController } from '../controllers/discussion.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.get('/discussions/courses/:courseId', isAuthenticated, getCourseDiscussionController);
router.post('/discussions/courses/:courseId', isAuthenticated, createDiscussionPostController);

export default router;
