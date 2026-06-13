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
import {
    setProjectRubric,
    submitSelfAssessment,
    submitPeerReview,
    hasCompletedAllAssignedReviews,
} from '../services/project-evaluation.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        const { courseId, title, description, requirements, deadline, enablePeerReview, peerReviewCount } = req.body;
        if (!courseId || !title || !description || !requirements) {
            return res.status(400).json({ error: 'courseId, title, description, requirements are required' });
        }
        const project = await createProject({
            courseId: Number(courseId),
            title,
            description,
            requirements,
            deadline,
            enablePeerReview: enablePeerReview !== undefined ? Boolean(enablePeerReview) : undefined,
            peerReviewCount: peerReviewCount !== undefined ? Number(peerReviewCount) : undefined,
            teacherId: user.userId
        });
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
        const { title, description, requirements, deadline, enablePeerReview, peerReviewCount } = req.body;
        const result = await updateProject(id, {
            title,
            description,
            requirements,
            deadline,
            enablePeerReview: enablePeerReview !== undefined ? Boolean(enablePeerReview) : undefined,
            peerReviewCount: peerReviewCount !== undefined ? Number(peerReviewCount) : undefined
        }, user.userId);
        return res.status(200).json(result);
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

export async function setProjectRubricController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

        const { rubrics } = req.body; // array of { id?, criteria, description, maxScore }
        if (!Array.isArray(rubrics)) {
            return res.status(400).json({ error: 'rubrics must be an array' });
        }

        const result = await setProjectRubric(projectId, rubrics, user.userId);
        return res.status(200).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
        if (msg === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
        if (msg.startsWith('CANNOT_DELETE_RUBRIC_WITH_SCORES')) {
            return res.status(400).json({ error: 'Cannot update/delete criteria with existing review scores.' });
        }
        return res.status(500).json({ error: 'Unable to set rubric' });
    }
}

export async function getProjectRubricController(req: Request, res: Response): Promise<Response> {
    try {
        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

        const rubrics = await prisma.rubricItem.findMany({
            where: { projectId },
            orderBy: { id: 'asc' }
        });
        return res.status(200).json(rubrics);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch rubric' });
    }
}

export async function submitSelfAssessmentController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const submissionId = Number(req.params.submissionId);
        if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submissionId' });

        const { feedback, scores } = req.body;
        if (!Array.isArray(scores)) {
            return res.status(400).json({ error: 'scores must be an array' });
        }

        const result = await submitSelfAssessment(submissionId, user.userId, { feedback, scores });
        return res.status(200).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'SUBMISSION_NOT_FOUND') return res.status(404).json({ error: 'Submission not found' });
        if (msg === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
        return res.status(500).json({ error: 'Unable to submit self assessment' });
    }
}

export async function getMyPeerReviewAssignmentsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const projectId = Number(req.params.id);
        if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

        const assignments = await prisma.peerReviewAssignment.findMany({
            where: {
                reviewerId: user.userId,
                submission: { projectId }
            },
            include: {
                submission: {
                    select: {
                        id: true,
                        repoUrl: true,
                        commitHistory: true
                    }
                },
                peerReview: {
                    include: { scores: true }
                }
            }
        });

        return res.status(200).json(assignments);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch peer assignments' });
    }
}

export async function getPeerReviewAssignmentDetailsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const assignmentId = Number(req.params.assignmentId);
        if (isNaN(assignmentId)) return res.status(400).json({ error: 'Invalid assignmentId' });

        const assignment = await prisma.peerReviewAssignment.findFirst({
            where: { id: assignmentId, reviewerId: user.userId },
            include: {
                submission: {
                    select: {
                        id: true,
                        repoUrl: true,
                        commitHistory: true,
                        project: {
                            include: { rubrics: true }
                        }
                    }
                },
                peerReview: {
                    include: { scores: true }
                }
            }
        });

        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        return res.status(200).json(assignment);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch assignment details' });
    }
}

export async function submitPeerReviewController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const assignmentId = Number(req.params.assignmentId);
        if (isNaN(assignmentId)) return res.status(400).json({ error: 'Invalid assignmentId' });

        const { feedback, scores } = req.body;
        if (!Array.isArray(scores)) {
            return res.status(400).json({ error: 'scores must be an array' });
        }

        const result = await submitPeerReview(assignmentId, user.userId, { feedback, scores });
        return res.status(200).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'ASSIGNMENT_NOT_FOUND') return res.status(404).json({ error: 'Assignment not found' });
        if (msg === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
        if (msg === 'ALREADY_COMPLETED') return res.status(400).json({ error: 'This peer review was already completed.' });
        return res.status(500).json({ error: 'Unable to submit peer review' });
    }
}

export async function getSubmissionReviewsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const submissionId = Number(req.params.submissionId);
        if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submissionId' });

        const submission = await prisma.projectSubmission.findUnique({
            where: { id: submissionId },
            include: {
                project: true,
                selfAssessment: {
                    include: { scores: true }
                },
                peerAssignments: {
                    where: { status: 'COMPLETED' },
                    include: {
                        peerReview: {
                            include: { scores: true }
                        }
                    }
                }
            }
        });

        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        // Enforce lock check for student
        const isOwnSubmission = submission.studentId === user.userId;
        const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'ADMIN';

        if (isOwnSubmission && submission.project.enablePeerReview) {
            const completedAll = await hasCompletedAllAssignedReviews(submission.projectId, user.userId);
            if (!completedAll) {
                return res.status(403).json({
                    error: 'COMPULSORY_REVIEWS_NOT_COMPLETED',
                    message: 'You must complete your assigned peer reviews to unlock your scores and feedback.'
                });
            }
        }

        if (!isOwnSubmission && !isTeacherOrAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Anonymize peer reviews for student
        const reviews = submission.peerAssignments
            .filter(a => a.peerReview)
            .map(a => {
                const review = a.peerReview!;
                return {
                    id: review.id,
                    feedback: review.feedback,
                    createdAt: review.createdAt,
                    scores: review.scores
                };
            });

        return res.status(200).json({
            selfAssessment: submission.selfAssessment,
            peerReviews: reviews,
            grade: submission.grade,
            feedback: submission.feedback // Teacher's feedback
        });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to fetch reviews' });
    }
}
