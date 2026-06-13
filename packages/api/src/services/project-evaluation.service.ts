import { PrismaClient, NotificationType } from '@prisma/client';
import { createNotification } from './notification.service';

const prisma = new PrismaClient();

/**
 * Configure or update rubric items for a project.
 */
export async function setProjectRubric(
    projectId: number,
    items: Array<{ id?: number; criteria: string; description: string; maxScore: number }>,
    teacherId: number
) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { course: true }
    });
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    if (project.course.teacherId !== teacherId) throw new Error('FORBIDDEN');

    // 1. Fetch current rubrics
    const currentRubrics = await prisma.rubricItem.findMany({
        where: { projectId }
    });

    const incomingIds = items.map(item => item.id).filter(Boolean) as number[];
    const toDelete = currentRubrics.filter(r => !incomingIds.includes(r.id));

    // Check if we can safely delete (no scores associated)
    for (const rubric of toDelete) {
        const scoreCount = await prisma.peerReviewScore.count({
            where: { rubricItemId: rubric.id }
        });
        if (scoreCount > 0) {
            throw new Error(`CANNOT_DELETE_RUBRIC_WITH_SCORES: ${rubric.criteria}`);
        }
    }

    return await prisma.$transaction(async (tx) => {
        // Delete removed rubrics
        if (toDelete.length > 0) {
            await tx.rubricItem.deleteMany({
                where: { id: { in: toDelete.map(r => r.id) } }
            });
        }

        const rubricResults = [];
        for (const item of items) {
            if (item.id) {
                // Update
                const updated = await tx.rubricItem.update({
                    where: { id: item.id },
                    data: {
                        criteria: item.criteria,
                        description: item.description,
                        maxScore: item.maxScore
                    }
                });
                rubricResults.push(updated);
            } else {
                // Create
                const created = await tx.rubricItem.create({
                    data: {
                        projectId,
                        criteria: item.criteria,
                        description: item.description,
                        maxScore: item.maxScore
                    }
                });
                rubricResults.push(created);
            }
        }
        return rubricResults;
    });
}

/**
 * Allocate peer review assignments when a project is submitted.
 * Uses a dynamic self-balancing allocation strategy.
 */
export async function allocatePeerReviews(projectId: number, studentId: number, submissionId: number) {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });
    if (!project || !project.enablePeerReview) return;

    const peerReviewCount = project.peerReviewCount;

    // 1. Assign other people's submissions to the submitting Student (A)
    // Find submissions by other students that have the fewest reviews assigned
    const otherSubmissions = await prisma.projectSubmission.findMany({
        where: {
            projectId,
            studentId: { not: studentId }
        },
        include: {
            peerAssignments: true
        }
    });

    // Sort by current assignment count ascending
    const sortedSubmissions = otherSubmissions.sort(
        (a, b) => a.peerAssignments.length - b.peerAssignments.length
    );

    // Pick top candidates
    const submissionsToAssign = sortedSubmissions.slice(0, peerReviewCount);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // Default review period is 7 days

    for (const sub of submissionsToAssign) {
        // Check if assignment already exists
        const exists = await prisma.peerReviewAssignment.findUnique({
            where: {
                submissionId_reviewerId: {
                    submissionId: sub.id,
                    reviewerId: studentId
                }
            }
        });
        if (!exists) {
            await prisma.peerReviewAssignment.create({
                data: {
                    submissionId: sub.id,
                    reviewerId: studentId,
                    status: 'PENDING',
                    deadline
                }
            });
        }
    }

    // 2. Assign the submitting Student's (A) submission to other students
    // Find students who have submitted, are not student A, and currently have few review duties assigned
    const potentialReviewers = await prisma.user.findMany({
        where: {
            id: { not: studentId },
            enrollments: {
                some: {
                    courseId: project.courseId,
                    isActive: true
                }
            },
            projectSubmissions: {
                some: {
                    projectId
                }
            }
        },
        include: {
            peerReviewAssignments: {
                where: {
                    submission: {
                        projectId
                    }
                }
            }
        }
    });

    // Sort reviewers by current assignment load ascending
    const sortedReviewers = potentialReviewers.sort(
        (a, b) => a.peerReviewAssignments.length - b.peerReviewAssignments.length
    );

    // Check how many reviewers this submission currently has
    const currentAssignments = await prisma.peerReviewAssignment.findMany({
        where: { submissionId }
    });
    let neededReviewers = peerReviewCount - currentAssignments.length;

    if (neededReviewers > 0) {
        const assignedReviewers = currentAssignments.map(a => a.reviewerId);
        const reviewersToAssign = sortedReviewers
            .filter(r => !assignedReviewers.includes(r.id))
            .slice(0, neededReviewers);

        for (const reviewer of reviewersToAssign) {
            await prisma.peerReviewAssignment.create({
                data: {
                    submissionId,
                    reviewerId: reviewer.id,
                    status: 'PENDING',
                    deadline
                }
            });

            // Notify reviewer
            await createNotification({
                userId: reviewer.id,
                type: NotificationType.DEADLINE_REMINDER,
                title: 'New Peer Review Assignment',
                message: `You have been assigned to review a classmate's submission for project "${project.title}".`,
                link: `/learning/${project.courseId}/projects`,
                sendEmail: true
            }).catch(() => {});
        }
    }
}

/**
 * Submit Self-Assessment for a project submission
 */
export async function submitSelfAssessment(
    submissionId: number,
    studentId: number,
    data: { feedback?: string; scores: Array<{ rubricItemId: number; score: number }> }
) {
    const submission = await prisma.projectSubmission.findUnique({
        where: { id: submissionId },
        include: { project: true }
    });
    if (!submission) throw new Error('SUBMISSION_NOT_FOUND');
    if (submission.studentId !== studentId) throw new Error('FORBIDDEN');

    // Create or update SelfAssessment
    const selfAssessment = await prisma.selfAssessment.upsert({
        where: { submissionId },
        create: {
            submissionId,
            feedback: data.feedback
        },
        update: {
            feedback: data.feedback
        }
    });

    // Save scores
    await prisma.peerReviewScore.deleteMany({
        where: { selfAssessmentId: selfAssessment.id }
    });

    for (const scoreInfo of data.scores) {
        await prisma.peerReviewScore.create({
            data: {
                selfAssessmentId: selfAssessment.id,
                rubricItemId: scoreInfo.rubricItemId,
                score: scoreInfo.score
            }
        });
    }

    await recalculateSubmissionGrade(submissionId);

    return selfAssessment;
}

/**
 * Submit Peer Review for an assignment
 */
export async function submitPeerReview(
    assignmentId: number,
    reviewerId: number,
    data: { feedback?: string; scores: Array<{ rubricItemId: number; score: number }> }
) {
    const assignment = await prisma.peerReviewAssignment.findUnique({
        where: { id: assignmentId },
        include: { submission: { include: { project: true } } }
    });
    if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
    if (assignment.reviewerId !== reviewerId) throw new Error('FORBIDDEN');
    if (assignment.status === 'COMPLETED') throw new Error('ALREADY_COMPLETED');

    const peerReview = await prisma.peerReview.create({
        data: {
            assignmentId,
            feedback: data.feedback
        }
    });

    for (const scoreInfo of data.scores) {
        await prisma.peerReviewScore.create({
            data: {
                peerReviewId: peerReview.id,
                rubricItemId: scoreInfo.rubricItemId,
                score: scoreInfo.score
            }
        });
    }

    await prisma.peerReviewAssignment.update({
        where: { id: assignmentId },
        data: { status: 'COMPLETED' }
    });

    await recalculateSubmissionGrade(assignment.submissionId);

    // Notify the submitter that their project received a review
    await createNotification({
        userId: assignment.submission.studentId,
        type: NotificationType.PROJECT_GRADED,
        title: 'New Peer Review Received',
        message: `A classmate has completed their review of your project "${assignment.submission.project.title}".`,
        link: `/learning/${assignment.submission.project.courseId}/projects`,
        sendEmail: true
    }).catch(() => {});

    return peerReview;
}

/**
 * Recalculate grade based on 80% peer reviews + 20% self-assessment
 * unless overridden by teacher.
 */
export async function recalculateSubmissionGrade(submissionId: number) {
    const submission = await prisma.projectSubmission.findUnique({
        where: { id: submissionId },
        include: {
            project: {
                include: { rubrics: true }
            },
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

    if (!submission) return;

    // Calculate maximum possible rubric score
    const totalMaxRubricScore = submission.project.rubrics.reduce((sum, r) => sum + r.maxScore, 0);
    if (totalMaxRubricScore === 0) return;

    // 1. Calculate Self Score (normalized to 10 points)
    let selfScore = 0;
    if (submission.selfAssessment) {
        const selfTotal = submission.selfAssessment.scores.reduce((sum, s) => sum + s.score, 0);
        selfScore = (selfTotal / totalMaxRubricScore) * 10;
    }

    // 2. Calculate Peer Score (normalized to 10 points)
    let peerScore = 0;
    const completedReviews = submission.peerAssignments.filter(a => a.peerReview);
    if (completedReviews.length > 0) {
        let peerTotalSum = 0;
        for (const reviewAssign of completedReviews) {
            if (reviewAssign.peerReview) {
                const reviewTotal = reviewAssign.peerReview.scores.reduce((sum, s) => sum + s.score, 0);
                peerTotalSum += reviewTotal;
            }
        }
        const peerAverageScore = peerTotalSum / completedReviews.length;
        peerScore = (peerAverageScore / totalMaxRubricScore) * 10;
    }

    // Calculate final grade
    let finalGrade = 0;
    if (completedReviews.length > 0) {
        // Enforce 80% peer score + 20% self score
        finalGrade = 0.8 * peerScore + 0.2 * selfScore;
    } else {
        // Fallback to self-assessment score if no peer reviews are completed yet
        finalGrade = selfScore;
    }

    // Keep grade field updated unless teacher manually overridden it.
    // How do we detect teacher override?
    // We check if there's a manual override. For simplicity, we can let recalculate run,
    // but if the teacher has set a grade, they can override it. We will allow the teacher
    // to manually set grade which won't be overwritten if we store an override or if we only recalculate
    // when teacher grade is null. Let's only update if the teacher hasn't set feedback/grade manually
    // or if we just want peer-based grading to be the default.
    // Let's only recalculate the grade if it is NOT overridden.
    // To implement a simple teacher override: if the teacher grades via the existing endpoint,
    // they set the `grade` on the `ProjectSubmission`.
    // Let's check if the submission has a teacher feedback. If feedback is present, we consider it a teacher override.
    // Or we can just allow the grade to be recalculated, but if the teacher manually updates, we store it.
    // Let's only run recalculate if the grade is null or if we don't have a teacher feedback.
    // Let's do: if feedback is present, don't overwrite it.
    if (submission.feedback) {
        // Teacher has graded it manually
        return;
    }

    // Update grade
    await prisma.projectSubmission.update({
        where: { id: submissionId },
        data: {
            grade: Math.round(finalGrade * 10) / 10 // Round to 1 decimal place
        }
    });
}

/**
 * Checks if a student has completed all of their assigned peer reviews for a project.
 */
export async function hasCompletedAllAssignedReviews(projectId: number, studentId: number): Promise<boolean> {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });
    if (!project || !project.enablePeerReview) return true;

    const assignments = await prisma.peerReviewAssignment.findMany({
        where: {
            reviewerId: studentId,
            submission: {
                projectId
            }
        }
    });

    // If they have no assignments (e.g. no other submissions existed yet), they are considered complete
    if (assignments.length === 0) return true;

    return assignments.every(a => a.status === 'COMPLETED');
}
