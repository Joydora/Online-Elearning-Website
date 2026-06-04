import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import {
    assertCanManageSyllabusCourse,
    parseSyllabus,
    commitSyllabus,
    ParsedChapter,
} from '../services/syllabusParser.service';
import { AuthenticatedUser } from '../types/auth';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser; file?: Express.Multer.File };

async function extractSyllabusText(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const buffer = fs.readFileSync(file.path);

    if (file.mimetype === 'application/pdf' || ext === '.pdf') {
        const parser = new PDFParse({ data: buffer });
        try {
            const parsed = await parser.getText();
            return parsed.text;
        } finally {
            await parser.destroy();
        }
    }

    if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
    ) {
        const parsed = await mammoth.extractRawText({ buffer });
        return parsed.value;
    }

    if (['.txt', '.md', '.markdown'].includes(ext) || file.mimetype.startsWith('text/')) {
        return buffer.toString('utf-8');
    }

    throw new Error('UNSUPPORTED_FILE_TYPE');
}

export async function parseSyllabusController(req: Request, res: Response): Promise<Response> {
    const authReq = req as AuthenticatedRequest;
    try {
        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        if (!authReq.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        await assertCanManageSyllabusCourse(courseId, authReq.user.userId, authReq.user.role);

        let text: string = (authReq.body?.text as string) || '';

        // If file uploaded, extract text from supported syllabus files.
        if (authReq.file) {
            try {
                text = await extractSyllabusText(authReq.file);
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
        const message = (e as Error).message;
        if (message === 'FORBIDDEN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (message === 'UNSUPPORTED_FILE_TYPE') {
            return res.status(400).json({ error: 'Only PDF, DOCX, MD, and TXT files are supported' });
        }
        return res.status(500).json({ error: message || 'Failed to parse syllabus' });
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

        const result = await commitSyllabus(
            courseId,
            authReq.user.userId,
            chapters as ParsedChapter[],
            authReq.user.role,
        );
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
