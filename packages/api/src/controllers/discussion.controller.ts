import { Request, Response } from 'express';
import { createDiscussionPost, getCourseDiscussion } from '../services/discussion.service';
import { AuthenticatedUser } from '../types/auth';

export async function getCourseDiscussionController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        const posts = await getCourseDiscussion(courseId);
        return res.status(200).json(posts);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch discussions',
            details: (error as Error).message,
        });
    }
}

export async function createDiscussionPostController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        const { text, parentId } = req.body ?? {};

        try {
            const post = await createDiscussionPost({
                courseId,
                userId: authReq.user.userId,
                userRole: authReq.user.role,
                text,
                parentId,
            });
            return res.status(201).json(post);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'DISCUSSION_TEXT_REQUIRED') {
                return res.status(400).json({ error: 'Nội dung bình luận là bắt buộc' });
            }
            if (message === 'DISCUSSION_ACCESS_DENIED') {
                return res.status(403).json({ error: 'Bạn không có quyền tham gia thảo luận khóa học này' });
            }
            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Không tìm thấy khóa học' });
            }
            if (message === 'INVALID_PARENT_POST') {
                return res.status(400).json({ error: 'Bình luận trả lời không hợp lệ' });
            }
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create discussion post',
            details: (error as Error).message,
        });
    }
}
