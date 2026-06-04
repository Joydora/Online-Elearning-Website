import { Request, Response } from 'express';
import { AuthenticatedUser } from '../types/auth';
import { getCertificateByCode, getCertificateForCourse } from '../services/certificate.service';

function auth(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

export async function getMyCourseCertificateController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        const certificate = await getCertificateForCourse(courseId, user.userId);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        return res.status(200).json(certificate);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch certificate' });
    }
}

export async function verifyCertificateController(req: Request, res: Response): Promise<Response> {
    try {
        const certificateCode = String(req.params.code || '').trim();
        if (!certificateCode) {
            return res.status(400).json({ error: 'certificate code is required' });
        }

        const certificate = await getCertificateByCode(certificateCode);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        return res.status(200).json(certificate);
    } catch {
        return res.status(500).json({ error: 'Unable to verify certificate' });
    }
}
