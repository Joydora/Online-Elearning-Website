import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

type CertificateRow = {
    id: number;
    certificateCode: string;
    issuedAt: Date;
    enrollmentId: number;
    studentId: number;
    courseId: number;
};

type CertificateDetailRow = CertificateRow & {
    studentFirstName: string | null;
    studentLastName: string | null;
    studentUsername: string;
    studentEmail: string;
    courseTitle: string;
    teacherFirstName: string | null;
    teacherLastName: string | null;
    teacherUsername: string;
    completionDate: Date | null;
    progress: number;
};

function createCertificateCode(enrollmentId: number, studentId: number, courseId: number): string {
    const digest = crypto
        .createHash('sha256')
        .update(`${enrollmentId}:${studentId}:${courseId}:${Date.now()}`)
        .digest('hex')
        .slice(0, 10)
        .toUpperCase();

    return `CERT-${courseId}-${studentId}-${digest}`;
}

export async function issueCertificateForEnrollment(enrollmentId: number) {
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: {
            id: true,
            studentId: true,
            courseId: true,
            progress: true,
            completionDate: true,
        },
    });

    if (!enrollment) {
        throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.progress < 100) {
        throw new Error('COURSE_NOT_COMPLETED');
    }

    if (!enrollment.completionDate) {
        await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { completionDate: new Date() },
        });
    }

    const existing = await prisma.$queryRaw<CertificateRow[]>`
        SELECT id, "certificateCode", "issuedAt", "enrollmentId", "studentId", "courseId"
        FROM "Certificate"
        WHERE "enrollmentId" = ${enrollmentId}
        LIMIT 1
    `;

    if (existing[0]) {
        return existing[0];
    }

    const created = await prisma.$queryRaw<CertificateRow[]>`
        INSERT INTO "Certificate" ("certificateCode", "enrollmentId", "studentId", "courseId")
        VALUES (
            ${createCertificateCode(enrollment.id, enrollment.studentId, enrollment.courseId)},
            ${enrollment.id},
            ${enrollment.studentId},
            ${enrollment.courseId}
        )
        RETURNING id, "certificateCode", "issuedAt", "enrollmentId", "studentId", "courseId"
    `;

    return created[0];
}

function mapCertificateDetail(row: CertificateDetailRow) {
    return {
        id: row.id,
        certificateCode: row.certificateCode,
        issuedAt: row.issuedAt,
        student: {
            firstName: row.studentFirstName,
            lastName: row.studentLastName,
            username: row.studentUsername,
            email: row.studentEmail,
        },
        course: {
            id: row.courseId,
            title: row.courseTitle,
            teacher: {
                firstName: row.teacherFirstName,
                lastName: row.teacherLastName,
                username: row.teacherUsername,
            },
        },
        enrollment: {
            completionDate: row.completionDate,
            progress: row.progress,
        },
    };
}

async function loadCertificateDetail(whereSql: 'course' | 'code', value: number | string, studentId?: number) {
    const rows = whereSql === 'course'
        ? await prisma.$queryRaw<CertificateDetailRow[]>`
            SELECT
                cert.id,
                cert."certificateCode",
                cert."issuedAt",
                cert."enrollmentId",
                cert."studentId",
                cert."courseId",
                student."firstName" AS "studentFirstName",
                student."lastName" AS "studentLastName",
                student."username" AS "studentUsername",
                student."email" AS "studentEmail",
                course."title" AS "courseTitle",
                teacher."firstName" AS "teacherFirstName",
                teacher."lastName" AS "teacherLastName",
                teacher."username" AS "teacherUsername",
                enrollment."completionDate",
                enrollment."progress"
            FROM "Certificate" cert
            JOIN "User" student ON student.id = cert."studentId"
            JOIN "Course" course ON course.id = cert."courseId"
            JOIN "User" teacher ON teacher.id = course."teacherId"
            JOIN "Enrollment" enrollment ON enrollment.id = cert."enrollmentId"
            WHERE cert."courseId" = ${value as number} AND cert."studentId" = ${studentId}
            LIMIT 1
        `
        : await prisma.$queryRaw<CertificateDetailRow[]>`
            SELECT
                cert.id,
                cert."certificateCode",
                cert."issuedAt",
                cert."enrollmentId",
                cert."studentId",
                cert."courseId",
                student."firstName" AS "studentFirstName",
                student."lastName" AS "studentLastName",
                student."username" AS "studentUsername",
                student."email" AS "studentEmail",
                course."title" AS "courseTitle",
                teacher."firstName" AS "teacherFirstName",
                teacher."lastName" AS "teacherLastName",
                teacher."username" AS "teacherUsername",
                enrollment."completionDate",
                enrollment."progress"
            FROM "Certificate" cert
            JOIN "User" student ON student.id = cert."studentId"
            JOIN "Course" course ON course.id = cert."courseId"
            JOIN "User" teacher ON teacher.id = course."teacherId"
            JOIN "Enrollment" enrollment ON enrollment.id = cert."enrollmentId"
            WHERE cert."certificateCode" = ${value as string}
            LIMIT 1
        `;

    return rows[0] ? mapCertificateDetail(rows[0]) : null;
}

export async function getCertificateForCourse(courseId: number, studentId: number) {
    const existing = await loadCertificateDetail('course', courseId, studentId);
    if (existing) return existing;

    const enrollment = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: {
                studentId,
                courseId,
            },
        },
        select: {
            id: true,
            progress: true,
            completionDate: true,
        },
    });

    if (!enrollment || enrollment.progress < 100) {
        return null;
    }

    if (!enrollment.completionDate) {
        await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { completionDate: new Date() },
        });
    }

    await issueCertificateForEnrollment(enrollment.id);

    return loadCertificateDetail('course', courseId, studentId);
}

export async function getCertificateByCode(certificateCode: string) {
    return loadCertificateDetail('code', certificateCode);
}
