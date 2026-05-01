import { Request, Response } from 'express';
import fs from 'fs';
import { parseSyllabus, commitSyllabus, ParsedChapter } from '../services/syllabusParser.service';
import { AuthenticatedUser } from '../types/auth';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser; file?: Express.Multer.File };

export async function parseSyllabusController(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthenticatedRequest;
    try {
        let text: string = (authReq.body?.text as string) || '';

        // If file uploaded, read it as text
        if (authReq.file) {
            try {
                text = fs.readFileSync(authReq.file.path, 'utf-8');
            } finally {
                try {
                    fs.unlinkSync(authReq.file.path); // clean up
                } catch {
                    // ignore cleanup errors
                }
            }
        }

        if (!text.trim()) {
            return res.status(400).json({ error: 'No syllabus text provided' });
        }

        const result = await parseSyllabus(text);
        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({ error: (e as Error).message || 'Failed to parse syllabus' });
    }
}

export async function commitSyllabusController(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthenticatedRequest;
    try {
        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        if (!authReq.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { chapters } = authReq.body ?? {};
        if (!chapters || !Array.isArray(chapters)) {
            return res.status(400).json({ error: 'chapters required' });
        }

        const result = await commitSyllabus(courseId, authReq.user.userId, chapters as ParsedChapter[]);
        return res.status(200).json({
            created: result.length,
            modules: result.map((r) => r.module),
        });
    } catch (e) {
        const message = (e as Error).message;
        if (message === 'FORBIDDEN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.status(500).json({ error: message || 'Failed to commit syllabus' });
    }
}
