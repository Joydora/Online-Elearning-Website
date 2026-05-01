import { Request, Response } from 'express';
import {
    createProject,
    updateProject,
    deleteProject,
    getProjectsByCourse,
    submitProject,
    refreshCommits,
    getSubmissionsByProject,
    getMySubmission,
    gradeSubmission,
} from '../services/project.service';
import { AuthenticatedUser } from '../types/auth';

function auth(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

export async function getProjectsByCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number(req.params.courseId);
        if (isNaN(courseId)) return res.status(400).json({ error: 'Invalid courseId' });
        return res.status(200).json(await getProjectsByCourse(courseId));
    } catch {
        return res.status(500).json({ error: 'Unable to fetch projects' });
    }
}

export async function createProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const { courseId, title, description, requirements, deadline } = req.body;
        if (!courseId || !title || !description || !requirements) {
            return res.status(400).json({ error: 'courseId, title, description, requirements are required' });
        }
        const project = await createProject({ courseId: Number(courseId), title, description, requirements, deadline, teacherId: user.userId });
        return res.status(201).json(project);
    } catch (error) {
        if ((error as Error).message === 'FORBIDDEN') return res.status(403).json({ error: 'You do not own this course' });
        return res.status(500).json({ error: 'Unable to create project' });
    }
}

export async function updateProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
        const { title, description, requirements, deadline } = req.body;
        return res.status(200).json(await updateProject(id, { title, description, requirements, deadline }, user.userId));
    } catch (error) {
        if ((error as Error).message === 'FORBIDDEN') return res.status(403).json({ error: 'You do not own this project' });
        return res.status(500).json({ error: 'Unable to update project' });
    }
}

export async function deleteProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
        await deleteProject(id, user.userId);
        return res.status(204).send();
    } catch (error) {
        if ((error as Error).message === 'FORBIDDEN') return res.status(403).json({ error: 'You do not own this project' });
        return res.status(500).json({ error: 'Unable to delete project' });
    }
}

export async function submitProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

        const { repoUrl } = req.body;
        if (!repoUrl || typeof repoUrl !== 'string') {
            return res.status(400).json({ error: 'repoUrl is required' });
        }

        const result = await submitProject({ projectId, studentId: user.userId, repoUrl });
        return res.status(200).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
        if (msg === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled in this course' });
        if (msg === 'INVALID_GITHUB_URL') return res.status(400).json({ error: 'Invalid GitHub repository URL' });
        return res.status(500).json({ error: 'Unable to submit project' });
    }
}

export async function refreshCommitsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const submissionId = Number(req.params.submissionId);
        if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submissionId' });

        const result = await refreshCommits(submissionId, user.userId);
        return res.status(200).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'SUBMISSION_NOT_FOUND') return res.status(404).json({ error: 'Submission not found' });
        if (msg === 'REPO_NOT_FOUND') return res.status(404).json({ error: 'GitHub repository not found' });
        if (msg === 'GITHUB_RATE_LIMIT') return res.status(429).json({ error: 'GitHub API rate limit exceeded' });
        return res.status(500).json({ error: 'Unable to refresh commits' });
    }
}

export async function getSubmissionsController(req: Request, res: Response): Promise<Response> {
    try {
        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });
        return res.status(200).json(await getSubmissionsByProject(projectId));
    } catch {
        return res.status(500).json({ error: 'Unable to fetch submissions' });
    }
}

export async function getMySubmissionController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

        const submission = await getMySubmission(projectId, user.userId);
        if (!submission) return res.status(404).json({ error: 'No submission found' });
        return res.status(200).json(submission);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch submission' });
    }
}

export async function gradeSubmissionController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const submissionId = Number(req.params.submissionId);
        if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submissionId' });

        const { feedback, grade } = req.body;
        return res.status(200).json(await gradeSubmission(submissionId, { feedback, grade: grade !== undefined ? Number(grade) : undefined }, user.userId));
    } catch (error) {
        if ((error as Error).message === 'FORBIDDEN') return res.status(403).json({ error: 'You do not own this project' });
        return res.status(500).json({ error: 'Unable to grade submission' });
    }
}
