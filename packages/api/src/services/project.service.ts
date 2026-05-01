import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchGitHubCommits(repoUrl: string): Promise<Prisma.InputJsonValue> {
    // Parse owner/repo from URL like https://github.com/owner/repo
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
    if (!match) throw new Error('INVALID_GITHUB_URL');

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`;

    const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ELearning-Platform',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
        if (response.status === 404) throw new Error('REPO_NOT_FOUND');
        if (response.status === 403) throw new Error('GITHUB_RATE_LIMIT');
        throw new Error('GITHUB_API_ERROR');
    }

    const commits = await response.json() as Array<{
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
        html_url: string;
    }>;

    return commits.map((c) => ({
        sha: c.sha.substring(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
    })) as Prisma.InputJsonValue;
}

// Teacher: create project for a course
export async function createProject(data: {
    courseId: number;
    title: string;
    description: string;
    requirements: string;
    deadline?: string;
    teacherId: number;
}) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course || course.teacherId !== data.teacherId) throw new Error('FORBIDDEN');

    return prisma.project.create({
        data: {
            courseId: data.courseId,
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        },
    });
}

export async function updateProject(id: number, data: Partial<{
    title: string;
    description: string;
    requirements: string;
    deadline: string;
}>, teacherId: number) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: { course: { select: { teacherId: true } } },
    });
    if (!project || project.course.teacherId !== teacherId) throw new Error('FORBIDDEN');

    return prisma.project.update({
        where: { id },
        data: {
            ...data,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        },
    });
}

export async function deleteProject(id: number, teacherId: number) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: { course: { select: { teacherId: true } } },
    });
    if (!project || project.course.teacherId !== teacherId) throw new Error('FORBIDDEN');

    return prisma.project.delete({ where: { id } });
}

export async function getProjectsByCourse(courseId: number) {
    return prisma.project.findMany({
        where: { courseId },
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

// Student: submit/update project
export async function submitProject(options: {
    projectId: number;
    studentId: number;
    repoUrl: string;
}) {
    const { projectId, studentId, repoUrl } = options;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, courseId: project.courseId, isActive: true },
    });
    if (!enrollment) throw new Error('NOT_ENROLLED');

    // Fetch latest commits from GitHub
    let commitHistory: Prisma.InputJsonValue = [];
    try {
        commitHistory = await fetchGitHubCommits(repoUrl);
    } catch {
        // Don't block submission if GitHub is unreachable
    }

    const existing = await prisma.projectSubmission.findUnique({
        where: { projectId_studentId: { projectId, studentId } },
    });

    if (existing) {
        return prisma.projectSubmission.update({
            where: { id: existing.id },
            data: { repoUrl, commitHistory },
        });
    }

    return prisma.projectSubmission.create({
        data: { projectId, studentId, repoUrl, commitHistory },
    });
}

// Refresh commits for a submission
export async function refreshCommits(submissionId: number, studentId: number) {
    const submission = await prisma.projectSubmission.findFirst({
        where: { id: submissionId, studentId },
    });
    if (!submission) throw new Error('SUBMISSION_NOT_FOUND');

    const commits = await fetchGitHubCommits(submission.repoUrl);
    return prisma.projectSubmission.update({
        where: { id: submissionId },
        data: { commitHistory: commits },
    });
}

export async function getSubmissionsByProject(projectId: number) {
    return prisma.projectSubmission.findMany({
        where: { projectId },
        include: {
            student: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { submittedAt: 'desc' },
    });
}

export async function getMySubmission(projectId: number, studentId: number) {
    return prisma.projectSubmission.findUnique({
        where: { projectId_studentId: { projectId, studentId } },
    });
}

// Teacher: grade a submission
export async function gradeSubmission(submissionId: number, data: { feedback?: string; grade?: number }, teacherId: number) {
    const submission = await prisma.projectSubmission.findUnique({
        where: { id: submissionId },
        include: { project: { include: { course: { select: { teacherId: true } } } } },
    });
    if (!submission || submission.project.course.teacherId !== teacherId) throw new Error('FORBIDDEN');

    return prisma.projectSubmission.update({
        where: { id: submissionId },
        data: { feedback: data.feedback, grade: data.grade },
    });
}
