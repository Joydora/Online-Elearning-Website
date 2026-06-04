import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getMyCourseCertificateController,
    verifyCertificateController,
} from '../controllers/certificate.controller';

const router = Router();

router.get(
    '/certificates/course/:courseId',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getMyCourseCertificateController,
);

router.get('/certificates/verify/:code', verifyCertificateController);

export default router;
