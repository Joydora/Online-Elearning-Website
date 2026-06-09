// File: packages/api/prisma/seed.ts
import { PrismaClient, Role, ContentType, EnrollmentType, PayoutStatus, CourseLevel, CourseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
    console.log('🗑️  Deleting old data...');

    // Truncate all tables and reset sequences so IDs always start from 1
    await prisma.$executeRaw`TRUNCATE TABLE
        "RevenueLedger", "ProjectSubmission", "Project",
        "PracticeSubmission", "Practice", "VideoQuizMarker",
        "ContentProgress", "Comment", "AnswerOption", "Question",
        "QuizAttempt", "Content", "Module", "Review", "Payment",
        "Enrollment", "Course", "Category", "User"
        RESTART IDENTITY CASCADE`;

    console.log('✅ Old data deleted.\n');

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // ============================================
    // 👑 CREATE ADMIN
    // ============================================
    const admin = await prisma.user.create({
        data: {
            email: 'admin@gmail.com',
            username: 'admin',
            hashedPassword,
            firstName: 'Admin',
            lastName: 'System',
            role: Role.ADMIN,
            isVerified: true,
        },
    });
    console.log('👑 Created 1 admin: admin@gmail.com');

    // ============================================
    // 👨‍🏫 CREATE TEACHERS
    // ============================================
    const teachers = await Promise.all([
        prisma.user.create({
            data: {
                email: 'nguyenvana@gmail.com',
                username: 'nguyenvana',
                hashedPassword,
                firstName: 'Văn A',
                lastName: 'Nguyễn',
                role: Role.TEACHER,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'tranthib@gmail.com',
                username: 'tranthib',
                hashedPassword,
                firstName: 'Thị B',
                lastName: 'Trần',
                role: Role.TEACHER,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'levanc@gmail.com',
                username: 'levanc',
                hashedPassword,
                firstName: 'Văn C',
                lastName: 'Lê',
                role: Role.TEACHER,
                isVerified: true,
            },
        }),
    ]);
    console.log(`👨‍🏫 Created ${teachers.length} teachers`);

    // ============================================
    // 🎓 CREATE STUDENTS
    // ============================================
    const students = await Promise.all([
        prisma.user.create({
            data: {
                email: 'student1@gmail.com',
                username: 'student01',
                hashedPassword,
                firstName: 'Minh',
                lastName: 'Phạm',
                role: Role.STUDENT,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'student2@gmail.com',
                username: 'student02',
                hashedPassword,
                firstName: 'Hương',
                lastName: 'Đỗ',
                role: Role.STUDENT,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'student3@gmail.com',
                username: 'student03',
                hashedPassword,
                firstName: 'Tuấn',
                lastName: 'Hoàng',
                role: Role.STUDENT,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'student4@gmail.com',
                username: 'student04',
                hashedPassword,
                firstName: 'Linh',
                lastName: 'Vũ',
                role: Role.STUDENT,
                isVerified: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'student5@gmail.com',
                username: 'student05',
                hashedPassword,
                firstName: 'Khoa',
                lastName: 'Bùi',
                role: Role.STUDENT,
                isVerified: true,
            },
        }),
    ]);
    console.log(`🎓 Created ${students.length} students`);

    // ============================================
    // 📁 CREATE CATEGORIES
    // ============================================
    const categories = await Promise.all([
        prisma.category.create({ data: { name: 'Web Development' } }),
        prisma.category.create({ data: { name: 'Mobile Development' } }),
        prisma.category.create({ data: { name: 'Database' } }),
        prisma.category.create({ data: { name: 'UI/UX Design' } }),
        prisma.category.create({ data: { name: 'DevOps & Cloud' } }),
        prisma.category.create({ data: { name: 'Artificial Intelligence' } }),
        prisma.category.create({ data: { name: 'Cybersecurity' } }),
        prisma.category.create({ data: { name: 'Soft Skills' } }),
    ]);
    console.log(`📁 Created ${categories.length} categories`);

    // ============================================
    // 📚 CREATE COURSES
    // ============================================

    // Course 1: FREE - React Basics (Teacher 1)
    const course1 = await prisma.course.create({
        data: {
            title: 'Learn React JS from Zero to Hero',
            description: 'A free course to help you master React JS from basic to advanced. You will learn about Components, Hooks, State Management, and build real-world applications.',
            price: 0, // FREE
            thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
            trialDurationDays: 7,
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'Introduction to React', lessons: ['What is React?', 'Environment Setup'] },
                    { title: 'Components & Props', lessons: ['Components', 'Props'] },
                ],
            },
            teacherId: teachers[0].id,
            categoryId: categories[0].id, // Web Development
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Introduction to React',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'What is React? Why learn React?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
                                    durationInSeconds: 600,
                                    isFreePreview: true,
                                },
                                {
                                    title: 'Development Environment Setup',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=CgkZ7MvWUAA',
                                    durationInSeconds: 480,
                                },
                                {
                                    title: 'Document: Node.js and VS Code Installation Guide',
                                    order: 3,
                                    contentType: ContentType.DOCUMENT,
                                    documentUrl: 'https://nodejs.org/en/download/',
                                    fileType: 'text/html',
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Components and Props',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Understanding Components',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=S4VH8hddg8c',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Props and Data Passing',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=PHaECbrKgs0',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Quiz: Components Knowledge Check',
                                    order: 3,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 10,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'What is a Component in React?',
                                                options: {
                                                    create: [
                                                        { optionText: 'A function or class that returns JSX', isCorrect: true },
                                                        { optionText: 'A CSS file', isCorrect: false },
                                                        { optionText: 'A database', isCorrect: false },
                                                        { optionText: 'A server', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'What are Props in React used for?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Passing data from parent to child component', isCorrect: true },
                                                        { optionText: 'Storing data in a database', isCorrect: false },
                                                        { optionText: 'CSS styling', isCorrect: false },
                                                        { optionText: 'Calling API', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Can Props be changed?',
                                                options: {
                                                    create: [
                                                        { optionText: 'No, props are read-only', isCorrect: true },
                                                        { optionText: 'Yes, props can be changed at any time', isCorrect: false },
                                                        { optionText: 'Can only be changed inside useEffect', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 3: State and Hooks',
                        order: 3,
                        contents: {
                            create: [
                                {
                                    title: 'useState Hook - State Management',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
                                    durationInSeconds: 660,
                                },
                                {
                                    title: 'useEffect Hook - Side Effects',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=0ZJgIjIuY7U',
                                    durationInSeconds: 780,
                                },
                                {
                                    title: 'Practice: Basic useState',
                                    order: 3,
                                    contentType: ContentType.PRACTICE,
                                    timeLimitInMinutes: 15,
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course1.title} (FREE)`);

    // Course 2: PAID - TypeScript Mastery (Teacher 1)
    const course2 = await prisma.course.create({
        data: {
            title: 'TypeScript Mastery - From Basics to Advanced',
            description: 'Comprehensive TypeScript course. Learn how to write safer code with static typing, generics, decorators, and advanced design patterns.',
            price: 1.99, // Low price for demo
            thumbnailUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
            accessDurationDays: 30,
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'TypeScript Foundations', lessons: ['Types', 'Interfaces'] },
                    { title: 'Generics', lessons: ['Generic functions'] },
                ],
            },
            teacherId: teachers[0].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chapter 1: TypeScript Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'What is TypeScript? Benefits of TypeScript',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Installation and Configuration',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs',
                                    durationInSeconds: 420,
                                },
                                {
                                    title: 'Document: TypeScript Handbook',
                                    order: 3,
                                    contentType: ContentType.DOCUMENT,
                                    documentUrl: 'https://www.typescriptlang.org/docs/handbook/',
                                    fileType: 'text/html',
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Types and Interfaces',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Basic Types in TypeScript',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=ahCwqrYpIuM',
                                    durationInSeconds: 600,
                                },
                                {
                                    title: 'Interfaces and Type Aliases',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=crjIq7LEAYw',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Quiz: Types and Interfaces',
                                    order: 3,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 15,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'What is the main difference between Interface and Type?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Interface can be extended and merged, Type cannot be merged', isCorrect: true },
                                                        { optionText: 'There is no difference', isCorrect: false },
                                                        { optionText: 'Type is faster than Interface', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Which of the following is a primitive type in TypeScript?',
                                                options: {
                                                    create: [
                                                        { optionText: 'string, number, boolean', isCorrect: true },
                                                        { optionText: 'array, object, function', isCorrect: false },
                                                        { optionText: 'interface, type, enum', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 3: Generics',
                        order: 3,
                        contents: {
                            create: [
                                {
                                    title: 'What is Generics and why do we need them?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=nViEqpgwxHE',
                                    durationInSeconds: 840,
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course2.title} ($${course2.price})`);

    // Course 3: FREE - Python Basics (Teacher 2)
    const course3 = await prisma.course.create({
        data: {
            title: 'Python for Beginners',
            description: 'Free Python course for beginners. Learn programming from scratch with the easiest language to learn.',
            price: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[1].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Getting Started with Python',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Python Introduction and Installation',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
                                    durationInSeconds: 600,
                                },
                                {
                                    title: 'Write Your First Python Program',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=DWgzHbglNIo',
                                    durationInSeconds: 480,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Variables and Data Types',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Variables in Python',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=cQT33yu9pY8',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Quiz: Python Basics Check',
                                    order: 2,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 10,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'What type of programming language is Python?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Interpreted', isCorrect: true },
                                                        { optionText: 'Compiled', isCorrect: false },
                                                        { optionText: 'Assembly', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'How do you declare a variable in Python?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Just assign a value: x = 10', isCorrect: true },
                                                        { optionText: 'Declare with type: int x = 10', isCorrect: false },
                                                        { optionText: 'Use var keyword: var x = 10', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course3.title} (FREE)`);

    // Course 4: PAID - Node.js & Express (Teacher 2)
    const course4 = await prisma.course.create({
        data: {
            title: 'Build REST APIs with Node.js & Express',
            description: 'Learn how to build professional backends with Node.js, Express, and MongoDB. Covers authentication, authorization, and deployment.',
            price: 2.99,
            thumbnailUrl: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
            accessDurationDays: 60,
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'Node.js Fundamentals', lessons: ['What is Node.js?', 'NPM'] },
                    { title: 'Express', lessons: ['Routing', 'Middleware'] },
                ],
            },
            teacherId: teachers[1].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Node.js Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'What is Node.js?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'NPM and Package Management',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=P3aKRdUyr0s',
                                    durationInSeconds: 600,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Express Framework',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Build servers with Express',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
                                    durationInSeconds: 840,
                                },
                                {
                                    title: 'Routing and Middleware',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=lY6icfhap2o',
                                    durationInSeconds: 780,
                                },
                                {
                                    title: 'Quiz: Express Basics',
                                    order: 3,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 10,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'What is Middleware in Express?',
                                                options: {
                                                    create: [
                                                        { optionText: 'A function that has access to request and response objects', isCorrect: true },
                                                        { optionText: 'A database type', isCorrect: false },
                                                        { optionText: 'A CSS framework', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course4.title} ($${course4.price})`);

    // Course 5: PAID - UI/UX Design (Teacher 3)
    const course5 = await prisma.course.create({
        data: {
            title: 'UI/UX Design with Figma',
            description: 'Learn professional user interface design with Figma. From wireframes to fully interactive prototypes.',
            price: 1.49,
            thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
            accessDurationDays: 45,
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[2].id,
            categoryId: categories[3].id, // UI/UX
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Introduction to UI/UX',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'UI vs UX - The Difference',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=5CxXhyhT6Fc',
                                    durationInSeconds: 480,
                                },
                                {
                                    title: 'Getting Started with Figma',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
                                    durationInSeconds: 660,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Design Principles',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Basic Design Principles',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=a5KYlHNKQB8',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Quiz: Design Principles',
                                    order: 2,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 8,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'What does UI stand for?',
                                                options: {
                                                    create: [
                                                        { optionText: 'User Interface', isCorrect: true },
                                                        { optionText: 'User Integration', isCorrect: false },
                                                        { optionText: 'Universal Interface', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'What does UX stand for?',
                                                options: {
                                                    create: [
                                                        { optionText: 'User Experience', isCorrect: true },
                                                        { optionText: 'User Extension', isCorrect: false },
                                                        { optionText: 'Universal Experience', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course5.title} ($${course5.price})`);

    // Course 6: FREE - Git & GitHub (Teacher 3)
    const course6 = await prisma.course.create({
        data: {
            title: 'Git & GitHub for Developers',
            description: 'Learn how to manage source code professionally with Git and GitHub. Covers branching, merging, and pull requests.',
            price: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800',
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[2].id,
            categoryId: categories[4].id, // DevOps
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Git Basics',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'What is Git? Why use Git?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=8JJ101D3knE',
                                    durationInSeconds: 900,
                                },
                                {
                                    title: 'Basic Git Commands',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=HVsySz-h9r4',
                                    durationInSeconds: 1800,
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course6.title} (FREE)`);

    // Course 7: PAID - SQL Database (Teacher 2)
    const course7 = await prisma.course.create({
        data: {
            title: 'SQL and PostgreSQL from A-Z',
            description: 'Master SQL and PostgreSQL. Learn how to design databases, write optimized queries, and manage data efficiently.',
            price: 2.49,
            thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[1].id,
            categoryId: categories[2].id, // Database
            modules: {
                create: [
                    {
                        title: 'Chapter 1: SQL Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Introduction to Databases and SQL',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
                                    durationInSeconds: 1200,
                                },
                                {
                                    title: 'SELECT, INSERT, UPDATE, DELETE',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=p3qvj9hO_Bo',
                                    durationInSeconds: 900,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chapter 2: Advanced SQL',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'JOIN and Subqueries',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw',
                                    durationInSeconds: 1080,
                                },
                                {
                                    title: 'Quiz: SQL Basics',
                                    order: 2,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 12,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'Which command is used to retrieve data from a database?',
                                                options: {
                                                    create: [
                                                        { optionText: 'SELECT', isCorrect: true },
                                                        { optionText: 'INSERT', isCorrect: false },
                                                        { optionText: 'UPDATE', isCorrect: false },
                                                        { optionText: 'DELETE', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'What does INNER JOIN return?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Only records that have matching values in both tables', isCorrect: true },
                                                        { optionText: 'All records from the left table', isCorrect: false },
                                                        { optionText: 'All records from both tables', isCorrect: false },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course7.title} ($${course7.price})`);

    // Course 8: PAID - Machine Learning (Teacher 1)
    const course8 = await prisma.course.create({
        data: {
            title: 'Introduction to Machine Learning with Python',
            description: 'Get started with Machine Learning. Learn basic ML algorithms and how to apply them using Python and scikit-learn.',
            price: 3.99,
            thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
            level: CourseLevel.ADVANCED,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[0].id,
            categoryId: categories[5].id, // AI
            modules: {
                create: [
                    {
                        title: 'Chapter 1: Introduction to Machine Learning',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'What is Machine Learning?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=ukzFI9rgwfU',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Types of Machine Learning',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=1vkb7BCMQd0',
                                    durationInSeconds: 600,
                                },
                            ],
                        },
                    },
                ],
            },
        },
        include: { modules: { include: { contents: true } } },
    });
    console.log(`📚 Created course: ${course8.title} ($${course8.price})`);

    console.log('\n✅ Created 8 courses total (4 FREE, 4 PAID)');

    await prisma.course.update({
        where: { id: course2.id },
        data: {
            prerequisites: {
                connect: [{ id: course1.id }],
            },
        },
    });

    await prisma.course.update({
        where: { id: course4.id },
        data: {
            prerequisites: {
                connect: [{ id: course3.id }],
            },
        },
    });

    await prisma.course.update({
        where: { id: course8.id },
        data: {
            prerequisites: {
                connect: [{ id: course3.id }],
            },
        },
    });

    const practiceContent = course1.modules
        .flatMap((module) => module.contents)
        .find((content) => content.contentType === ContentType.PRACTICE);

    if (!practiceContent) {
        throw new Error('Practice content not found in course 1.');
    }

    const practice = await prisma.practice.create({
        data: {
            contentId: practiceContent.id,
            prompt: 'Create a React component that displays a counter and has a button to increment the value.',
            starterCode: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  // TODO: implement\n  return <div />;\n}\n`,
            expectedOutput: 'Component displays a number and increments it when the button is clicked',
            rubric: 'Uses useState, displays the number, and has a button to increment the value',
            language: 'javascript',
        },
    });

    await prisma.practiceSubmission.create({
        data: {
            studentId: students[0].id,
            practiceId: practice.id,
            submittedCode: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <p>{count}</p>\n      <button onClick={() => setCount(count + 1)}>Increase</button>\n    </div>\n  );\n}\n`,
            aiFeedback: 'You have used useState correctly.',
            score: 0.9,
            passed: true,
        },
    });

    const project = await prisma.project.create({
        data: {
            title: 'Build a REST API for a Todo App',
            description: 'Design a CRUD API for a Todo App using Express and PostgreSQL.',
            requirements: 'Complete CRUD endpoints, data validation, and use Prisma.',
            deadline: daysFromNow(14),
            courseId: course4.id,
        },
    });

    await prisma.projectSubmission.create({
        data: {
            projectId: project.id,
            studentId: students[2].id,
            repoUrl: 'https://github.com/example/todo-api',
            commitHistory: [
                { hash: 'a1b2c3', message: 'Init project', date: now.toISOString() },
                { hash: 'd4e5f6', message: 'Add CRUD endpoints', date: now.toISOString() },
            ],
            feedback: 'Need to add more detailed validation and error handling.',
            grade: 7.5,
        },
    });

    // ============================================
    // 📝 CREATE ENROLLMENTS
    // ============================================
    const enrollments = await Promise.all([
        // Student 1: Enrolled in 4 courses
        prisma.enrollment.create({
            data: {
                studentId: students[0].id,
                courseId: course1.id,
                type: EnrollmentType.TRIAL,
                expiresAt: daysFromNow(7),
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[0].id,
                courseId: course2.id,
                type: EnrollmentType.PAID,
                expiresAt: daysFromNow(30),
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[0].id,
                courseId: course3.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[0].id,
                courseId: course6.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),

        // Student 2: Enrolled in 3 courses
        prisma.enrollment.create({
            data: {
                studentId: students[1].id,
                courseId: course1.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[1].id,
                courseId: course5.id,
                type: EnrollmentType.PAID,
                expiresAt: daysFromNow(45),
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[1].id,
                courseId: course6.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),

        // Student 3: Enrolled in 2 courses
        prisma.enrollment.create({
            data: {
                studentId: students[2].id,
                courseId: course3.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[2].id,
                courseId: course4.id,
                type: EnrollmentType.PAID,
                expiresAt: daysFromNow(30),
                isActive: true,
            },
        }),

        // Student 4: Enrolled in 3 courses
        prisma.enrollment.create({
            data: {
                studentId: students[3].id,
                courseId: course1.id,
                type: EnrollmentType.FREE,
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[3].id,
                courseId: course7.id,
                type: EnrollmentType.PAID,
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[3].id,
                courseId: course8.id,
                type: EnrollmentType.PAID,
                isActive: true,
            },
        }),

        // Student 5: Enrolled in 2 courses
        prisma.enrollment.create({
            data: {
                studentId: students[4].id,
                courseId: course2.id,
                type: EnrollmentType.PAID,
                expiresAt: daysFromNow(30),
                isActive: true,
            },
        }),
        prisma.enrollment.create({
            data: {
                studentId: students[4].id,
                courseId: course5.id,
                type: EnrollmentType.PAID,
                expiresAt: daysFromNow(45),
                isActive: true,
            },
        }),
    ]);
    console.log(`📝 Created ${enrollments.length} enrollments`);

    const payments = await Promise.all([
        prisma.payment.create({
            data: {
                amount: course2.price,
                status: 'SUCCESSFUL',
                stripeSessionId: 'seed_session_course2_student1',
                enrollmentId: enrollments[1].id,
                studentId: students[0].id,
            },
        }),
        prisma.payment.create({
            data: {
                amount: course5.price,
                status: 'SUCCESSFUL',
                stripeSessionId: 'seed_session_course5_student2',
                enrollmentId: enrollments[5].id,
                studentId: students[1].id,
            },
        }),
    ]);
    console.log(`💳 Created ${payments.length} payments`);

    const ledgers = await Promise.all([
        prisma.revenueLedger.create({
            data: {
                paymentId: payments[0].id,
                enrollmentId: enrollments[1].id,
                courseId: course2.id,
                teacherId: teachers[0].id,
                grossAmount: course2.price,
                platformFee: Number((course2.price * 0.2).toFixed(2)),
                teacherShare: Number((course2.price * 0.8).toFixed(2)),
                payoutStatus: PayoutStatus.HELD,
            },
        }),
        prisma.revenueLedger.create({
            data: {
                paymentId: payments[1].id,
                enrollmentId: enrollments[5].id,
                courseId: course5.id,
                teacherId: teachers[2].id,
                grossAmount: course5.price,
                platformFee: Number((course5.price * 0.2).toFixed(2)),
                teacherShare: Number((course5.price * 0.8).toFixed(2)),
                payoutStatus: PayoutStatus.HELD,
            },
        }),
    ]);
    console.log(`💰 Created ${ledgers.length} revenue ledger entries`);

    // ============================================
    // ⭐ CREATE REVIEWS (linked to enrollments)
    // ============================================
    const reviews = await Promise.all([
        // Reviews for Course 1 (React) - students[0], students[1], students[3] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'The course is amazing and easy to follow! The explanation is very detailed, I learned a lot about React.',
                studentId: students[0].id,
                enrollmentId: enrollments[0].id, // student[0] -> course1
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Good content, suitable for beginners. Looking forward to advanced topics.',
                studentId: students[1].id,
                enrollmentId: enrollments[4].id, // student[1] -> course1
            },
        }),
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Excellent! This is the best React course I have ever taken.',
                studentId: students[3].id,
                enrollmentId: enrollments[9].id, // student[3] -> course1
            },
        }),

        // Reviews for Course 2 (TypeScript) - students[0], students[4] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'TypeScript is no longer difficult. Thank you, teacher!',
                studentId: students[0].id,
                enrollmentId: enrollments[1].id, // student[0] -> course2
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'High-quality course, worth every penny.',
                studentId: students[4].id,
                enrollmentId: enrollments[12].id, // student[4] -> course2
            },
        }),

        // Reviews for Course 3 (Python) - students[0], students[2] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Python is really easy to learn with this course. Highly recommend to everyone!',
                studentId: students[2].id,
                enrollmentId: enrollments[7].id, // student[2] -> course3
            },
        }),

        // Reviews for Course 5 (UI/UX) - students[1], students[4] are enrolled
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Figma is no longer an issue for me. Very practical course.',
                studentId: students[1].id,
                enrollmentId: enrollments[5].id, // student[1] -> course5
            },
        }),
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'I designed my first UI after taking this course!',
                studentId: students[4].id,
                enrollmentId: enrollments[13].id, // student[4] -> course5
            },
        }),

        // Reviews for Course 6 (Git) - students[0], students[1] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Git is not scary anymore. The videos are easy to follow.',
                studentId: students[0].id,
                enrollmentId: enrollments[3].id, // student[0] -> course6
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Basic but comprehensive content. Perfect for beginners.',
                studentId: students[1].id,
                enrollmentId: enrollments[6].id, // student[1] -> course6
            },
        }),
    ]);
    console.log(`⭐ Created ${reviews.length} reviews`);

    // ============================================
    // 💬 CREATE COMMENTS
    // ============================================
    // Get first content of course 1 for comments
    const firstContent = course1.modules[0].contents[0];

    const comments = await Promise.all([
        prisma.comment.create({
            data: {
                text: 'Great video! Could you please explain more about the Virtual DOM?',
                authorId: students[0].id,
                contentId: firstContent.id,
            },
        }),
        prisma.comment.create({
            data: {
                text: 'Thank you, teacher! I now understand what React is.',
                authorId: students[1].id,
                contentId: firstContent.id,
            },
        }),
        prisma.comment.create({
            data: {
                text: 'When will the next part be released, teacher?',
                authorId: students[3].id,
                contentId: firstContent.id,
            },
        }),
    ]);
    console.log(`💬 Created ${comments.length} comments`);

    // ============================================
    // 📊 SUMMARY
    // ============================================
    console.log('\n========================================');
    console.log('🎉 SEED DATA CREATED SUCCESSFULLY!');
    console.log('========================================\n');

    console.log('📊 SUMMARY:');
    console.log('------------------------------------------');
    console.log(`👑 Admin: 1 (admin@gmail.com)`);
    console.log(`👨‍🏫 Teachers: ${teachers.length}`);
    console.log(`🎓 Students: ${students.length}`);
    console.log(`📁 Categories: ${categories.length}`);
    console.log(`📚 Courses: 8 (4 FREE, 4 PAID)`);
    console.log(`📝 Enrollments: ${enrollments.length}`);
    console.log(`💳 Payments: ${payments.length}`);
    console.log(`💰 Revenue Ledgers: ${ledgers.length}`);
    console.log('🧪 Practice: 1 content, 1 submission');
    console.log('📦 Projects: 1 project, 1 submission');
    console.log(`⭐ Reviews: ${reviews.length}`);
    console.log(`💬 Comments: ${comments.length}`);
    console.log('------------------------------------------\n');

    console.log('🔐 LOGIN CREDENTIALS (Password: Password123!):');
    console.log('------------------------------------------');
    console.log('👑 Admin:    admin@gmail.com');
    console.log('👨‍🏫 Teacher:  nguyenvana@gmail.com');
    console.log('👨‍🏫 Teacher:  tranthib@gmail.com');
    console.log('👨‍🏫 Teacher:  levanc@gmail.com');
    console.log('🎓 Student:  student1@gmail.com');
    console.log('🎓 Student:  student2@gmail.com');
    console.log('🎓 Student:  student3@gmail.com');
    console.log('🎓 Student:  student4@gmail.com');
    console.log('🎓 Student:  student5@gmail.com');
    console.log('------------------------------------------\n');
}

main()
    .catch((e) => {
        console.error('❌ Error while seeding data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });