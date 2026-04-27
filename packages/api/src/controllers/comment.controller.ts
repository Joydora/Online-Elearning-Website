import { Request, Response } from 'express';
import { getComments, postComment } from '../services/comment.service';
import { AuthenticatedUser } from '../types/auth';

export async function getCommentsController(req: Request, res: Response): Promise<Response> {
    try {
        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        const comments = await getComments(contentId);
        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch comments',
        });
    }
}

export async function postCommentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        const { text, parentId } = req.body ?? {};

        try {
            const comment = await postComment({
                contentId,
                userId: authReq.user.userId,
                text,
                parentId,
            });

            return res.status(201).json(comment);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COMMENT_TEXT_REQUIRED') {
                return res.status(400).json({ error: 'Comment text is required' });
            }

            if (message === 'ENROLLMENT_REQUIRED') {
                return res.status(403).json({ error: 'Bạn phải đăng ký khóa học để bình luận' });
            }

            if (message === 'ENROLLMENT_EXPIRED') {
                return res.status(403).json({ error: 'Quyền truy cập của bạn đã hết hạn' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to post comment',
        });
    }
}
