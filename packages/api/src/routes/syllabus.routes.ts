import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    parseSyllabusController,
    commitSyllabusController,
} from '../controllers/syllabus.controller';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.post(
    '/courses/:id/syllabus/parse',
    isAuthenticated,
    isAuthorized([Role.TEACHER]),
    upload.single('file'),
    parseSyllabusController,
);
router.post(
    '/courses/:id/syllabus/commit',
    isAuthenticated,
    isAuthorized([Role.TEACHER]),
    commitSyllabusController,
);

export default router;
