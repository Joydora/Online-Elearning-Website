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
        prisma.category.create({ data: { name: 'Lập trình Web' } }),
        prisma.category.create({ data: { name: 'Lập trình Mobile' } }),
        prisma.category.create({ data: { name: 'Cơ sở dữ liệu' } }),
        prisma.category.create({ data: { name: 'Thiết kế UI/UX' } }),
        prisma.category.create({ data: { name: 'DevOps & Cloud' } }),
        prisma.category.create({ data: { name: 'Trí tuệ nhân tạo' } }),
        prisma.category.create({ data: { name: 'An ninh mạng' } }),
        prisma.category.create({ data: { name: 'Kỹ năng mềm' } }),
    ]);
    console.log(`📁 Created ${categories.length} categories`);

    // ============================================
    // 📚 CREATE COURSES
    // ============================================

    // Course 1: FREE - React Basics (Teacher 1)
    const course1 = await prisma.course.create({
        data: {
            title: 'Học React JS từ Zero đến Hero',
            description: 'Khóa học miễn phí giúp bạn nắm vững React JS từ cơ bản đến nâng cao. Bạn sẽ học về Components, Hooks, State Management và xây dựng ứng dụng thực tế.',
            price: 0, // FREE
            thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
            trialDurationDays: 7,
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'Giới thiệu React', lessons: ['React là gì?', 'Cài đặt môi trường'] },
                    { title: 'Components & Props', lessons: ['Components', 'Props'] },
                ],
            },
            teacherId: teachers[0].id,
            categoryId: categories[0].id, // Lập trình Web
            modules: {
                create: [
                    {
                        title: 'Chương 1: Giới thiệu React',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'React là gì? Tại sao nên học React?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
                                    durationInSeconds: 600,
                                    isFreePreview: true,
                                },
                                {
                                    title: 'Cài đặt môi trường phát triển',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=CgkZ7MvWUAA',
                                    durationInSeconds: 480,
                                },
                                {
                                    title: 'Tài liệu: Hướng dẫn cài đặt Node.js và VS Code',
                                    order: 3,
                                    contentType: ContentType.DOCUMENT,
                                    documentUrl: 'https://nodejs.org/en/download/',
                                    fileType: 'text/html',
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chương 2: Components và Props',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Tìm hiểu về Components',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=S4VH8hddg8c',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Props và cách truyền dữ liệu',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=PHaECbrKgs0',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Quiz: Kiểm tra kiến thức Components',
                                    order: 3,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 10,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'Component trong React là gì?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Một hàm hoặc class trả về JSX', isCorrect: true },
                                                        { optionText: 'Một file CSS', isCorrect: false },
                                                        { optionText: 'Một database', isCorrect: false },
                                                        { optionText: 'Một server', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Props trong React dùng để làm gì?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Truyền dữ liệu từ component cha sang con', isCorrect: true },
                                                        { optionText: 'Lưu trữ dữ liệu trong database', isCorrect: false },
                                                        { optionText: 'Định dạng CSS', isCorrect: false },
                                                        { optionText: 'Gọi API', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Props có thể thay đổi được không?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Không, props là read-only', isCorrect: true },
                                                        { optionText: 'Có, props có thể thay đổi bất cứ lúc nào', isCorrect: false },
                                                        { optionText: 'Chỉ thay đổi được trong useEffect', isCorrect: false },
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
                        title: 'Chương 3: State và Hooks',
                        order: 3,
                        contents: {
                            create: [
                                {
                                    title: 'useState Hook - Quản lý state',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
                                    durationInSeconds: 660,
                                },
                                {
                                    title: 'useEffect Hook - Side effects',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=0ZJgIjIuY7U',
                                    durationInSeconds: 780,
                                },
                                {
                                    title: 'Thực hành: useState cơ bản',
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
            title: 'TypeScript Mastery - Từ cơ bản đến nâng cao',
            description: 'Khóa học TypeScript toàn diện. Học cách viết code an toàn hơn với static typing, generics, decorators và các patterns nâng cao.',
            price: 1.99, // Low price for demo
            thumbnailUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
            accessDurationDays: 30,
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'Nền tảng TypeScript', lessons: ['Types', 'Interfaces'] },
                    { title: 'Generics', lessons: ['Generic functions'] },
                ],
            },
            teacherId: teachers[0].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chương 1: TypeScript Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'TypeScript là gì? Lợi ích của TypeScript',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Cài đặt và cấu hình TypeScript',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs',
                                    durationInSeconds: 420,
                                },
                                {
                                    title: 'Tài liệu: TypeScript Handbook',
                                    order: 3,
                                    contentType: ContentType.DOCUMENT,
                                    documentUrl: 'https://www.typescriptlang.org/docs/handbook/',
                                    fileType: 'text/html',
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chương 2: Types và Interfaces',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Basic Types trong TypeScript',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=ahCwqrYpIuM',
                                    durationInSeconds: 600,
                                },
                                {
                                    title: 'Interfaces và Type Aliases',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=crjIq7LEAYw',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Quiz: Types và Interfaces',
                                    order: 3,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 15,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'Sự khác biệt chính giữa Interface và Type là gì?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Interface có thể extend và merge, Type thì không thể merge', isCorrect: true },
                                                        { optionText: 'Không có sự khác biệt', isCorrect: false },
                                                        { optionText: 'Type nhanh hơn Interface', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Kiểu dữ liệu nào sau đây là primitive type trong TypeScript?',
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
                        title: 'Chương 3: Generics',
                        order: 3,
                        contents: {
                            create: [
                                {
                                    title: 'Generics là gì và tại sao cần Generics?',
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
            title: 'Python cho người mới bắt đầu',
            description: 'Khóa học Python miễn phí dành cho người mới. Học lập trình từ con số 0 với ngôn ngữ dễ học nhất.',
            price: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[1].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chương 1: Làm quen với Python',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Giới thiệu Python và cài đặt',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
                                    durationInSeconds: 600,
                                },
                                {
                                    title: 'Viết chương trình Python đầu tiên',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=DWgzHbglNIo',
                                    durationInSeconds: 480,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chương 2: Biến và kiểu dữ liệu',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Biến trong Python',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=cQT33yu9pY8',
                                    durationInSeconds: 540,
                                },
                                {
                                    title: 'Quiz: Kiến thức cơ bản Python',
                                    order: 2,
                                    contentType: ContentType.QUIZ,
                                    timeLimitInMinutes: 10,
                                    questions: {
                                        create: [
                                            {
                                                questionText: 'Python là ngôn ngữ lập trình loại nào?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Interpreted (thông dịch)', isCorrect: true },
                                                        { optionText: 'Compiled (biên dịch)', isCorrect: false },
                                                        { optionText: 'Assembly', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'Cách khai báo biến trong Python?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Chỉ cần gán giá trị: x = 10', isCorrect: true },
                                                        { optionText: 'Phải khai báo kiểu: int x = 10', isCorrect: false },
                                                        { optionText: 'Dùng từ khóa var: var x = 10', isCorrect: false },
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
            title: 'Xây dựng REST API với Node.js & Express',
            description: 'Học cách xây dựng backend chuyên nghiệp với Node.js, Express, và MongoDB. Bao gồm authentication, authorization, và deployment.',
            price: 2.99,
            thumbnailUrl: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
            accessDurationDays: 60,
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            syllabus: {
                chapters: [
                    { title: 'Node.js Fundamentals', lessons: ['Node.js là gì?', 'NPM'] },
                    { title: 'Express', lessons: ['Routing', 'Middleware'] },
                ],
            },
            teacherId: teachers[1].id,
            categoryId: categories[0].id,
            modules: {
                create: [
                    {
                        title: 'Chương 1: Node.js Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Node.js là gì?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'NPM và Package Management',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=P3aKRdUyr0s',
                                    durationInSeconds: 600,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chương 2: Express Framework',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Xây dựng server với Express',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
                                    durationInSeconds: 840,
                                },
                                {
                                    title: 'Routing và Middleware',
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
                                                questionText: 'Middleware trong Express là gì?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Hàm có quyền truy cập vào request và response object', isCorrect: true },
                                                        { optionText: 'Một loại database', isCorrect: false },
                                                        { optionText: 'Một framework CSS', isCorrect: false },
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
            title: 'UI/UX Design với Figma',
            description: 'Học thiết kế giao diện người dùng chuyên nghiệp với Figma. Từ wireframe đến prototype hoàn chỉnh.',
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
                        title: 'Chương 1: Giới thiệu UI/UX',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'UI vs UX - Sự khác biệt',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=5CxXhyhT6Fc',
                                    durationInSeconds: 480,
                                },
                                {
                                    title: 'Làm quen với Figma',
                                    order: 2,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
                                    durationInSeconds: 660,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Chương 2: Design Principles',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'Nguyên tắc thiết kế cơ bản',
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
                                                questionText: 'UI là viết tắt của?',
                                                options: {
                                                    create: [
                                                        { optionText: 'User Interface', isCorrect: true },
                                                        { optionText: 'User Integration', isCorrect: false },
                                                        { optionText: 'Universal Interface', isCorrect: false },
                                                    ],
                                                },
                                            },
                                            {
                                                questionText: 'UX là viết tắt của?',
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
            title: 'Git & GitHub cho lập trình viên',
            description: 'Học cách quản lý source code chuyên nghiệp với Git và GitHub. Bao gồm branching, merging, pull requests.',
            price: 0,
            thumbnailUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800',
            level: CourseLevel.BEGINNER,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[2].id,
            categoryId: categories[4].id, // DevOps
            modules: {
                create: [
                    {
                        title: 'Chương 1: Git Basics',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Git là gì? Tại sao cần dùng Git?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=8JJ101D3knE',
                                    durationInSeconds: 900,
                                },
                                {
                                    title: 'Các lệnh Git cơ bản',
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
            title: 'SQL và PostgreSQL từ A-Z',
            description: 'Thành thạo SQL và PostgreSQL. Học cách thiết kế database, viết query tối ưu, và quản lý dữ liệu hiệu quả.',
            price: 2.49,
            thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
            level: CourseLevel.INTERMEDIATE,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[1].id,
            categoryId: categories[2].id, // Database
            modules: {
                create: [
                    {
                        title: 'Chương 1: SQL Fundamentals',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Giới thiệu về Database và SQL',
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
                        title: 'Chương 2: Advanced SQL',
                        order: 2,
                        contents: {
                            create: [
                                {
                                    title: 'JOIN và Subqueries',
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
                                                questionText: 'Lệnh nào dùng để lấy dữ liệu từ database?',
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
                                                questionText: 'INNER JOIN trả về?',
                                                options: {
                                                    create: [
                                                        { optionText: 'Chỉ các bản ghi có match ở cả 2 bảng', isCorrect: true },
                                                        { optionText: 'Tất cả bản ghi từ bảng trái', isCorrect: false },
                                                        { optionText: 'Tất cả bản ghi từ cả 2 bảng', isCorrect: false },
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
            title: 'Machine Learning cơ bản với Python',
            description: 'Nhập môn Machine Learning. Học các thuật toán ML cơ bản và cách áp dụng với Python và scikit-learn.',
            price: 3.99,
            thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
            level: CourseLevel.ADVANCED,
            status: CourseStatus.PUBLISHED,
            teacherId: teachers[0].id,
            categoryId: categories[5].id, // AI
            modules: {
                create: [
                    {
                        title: 'Chương 1: Giới thiệu Machine Learning',
                        order: 1,
                        contents: {
                            create: [
                                {
                                    title: 'Machine Learning là gì?',
                                    order: 1,
                                    contentType: ContentType.VIDEO,
                                    videoUrl: 'https://www.youtube.com/watch?v=ukzFI9rgwfU',
                                    durationInSeconds: 720,
                                },
                                {
                                    title: 'Các loại Machine Learning',
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
            prompt: 'Tạo một component React hiển thị bộ đếm và có nút tăng giá trị.',
            starterCode: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  // TODO: implement\n  return <div />;\n}\n`,
            expectedOutput: 'Component hiển thị số và tăng khi bấm nút',
            rubric: 'Sử dụng useState, hiển thị số, có nút tăng giá trị',
            language: 'javascript',
        },
    });

    await prisma.practiceSubmission.create({
        data: {
            studentId: students[0].id,
            practiceId: practice.id,
            submittedCode: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <p>{count}</p>\n      <button onClick={() => setCount(count + 1)}>Increase</button>\n    </div>\n  );\n}\n`,
            aiFeedback: 'Bạn đã sử dụng useState đúng cách.',
            score: 0.9,
            passed: true,
        },
    });

    const project = await prisma.project.create({
        data: {
            title: 'Xây dựng REST API cho Todo App',
            description: 'Thiết kế API CRUD cho Todo App với Express và PostgreSQL.',
            requirements: 'Có đầy đủ CRUD endpoints, validate dữ liệu, dùng Prisma.',
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
            feedback: 'Cần bổ sung validation và error handling chi tiết hơn.',
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
                comment: 'Khóa học rất hay và dễ hiểu! Thầy giảng rất chi tiết, tôi đã học được rất nhiều về React.',
                studentId: students[0].id,
                enrollmentId: enrollments[0].id, // student[0] -> course1
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Nội dung tốt, phù hợp cho người mới bắt đầu. Mong có thêm phần nâng cao.',
                studentId: students[1].id,
                enrollmentId: enrollments[4].id, // student[1] -> course1
            },
        }),
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Tuyệt vời! Đây là khóa học React tốt nhất mà tôi từng học.',
                studentId: students[3].id,
                enrollmentId: enrollments[9].id, // student[3] -> course1
            },
        }),

        // Reviews for Course 2 (TypeScript) - students[0], students[4] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'TypeScript giờ không còn khó nữa. Cảm ơn thầy!',
                studentId: students[0].id,
                enrollmentId: enrollments[1].id, // student[0] -> course2
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Khóa học chất lượng, đáng giá từng đồng.',
                studentId: students[4].id,
                enrollmentId: enrollments[12].id, // student[4] -> course2
            },
        }),

        // Reviews for Course 3 (Python) - students[0], students[2] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Python thật sự dễ học với khóa này. Recommend cho mọi người!',
                studentId: students[2].id,
                enrollmentId: enrollments[7].id, // student[2] -> course3
            },
        }),

        // Reviews for Course 5 (UI/UX) - students[1], students[4] are enrolled
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Figma giờ không còn là vấn đề với tôi. Khóa học rất thực tế.',
                studentId: students[1].id,
                enrollmentId: enrollments[5].id, // student[1] -> course5
            },
        }),
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Tôi đã thiết kế được UI đầu tiên sau khóa học này!',
                studentId: students[4].id,
                enrollmentId: enrollments[13].id, // student[4] -> course5
            },
        }),

        // Reviews for Course 6 (Git) - students[0], students[1] are enrolled
        prisma.review.create({
            data: {
                rating: 5,
                comment: 'Git không còn đáng sợ nữa. Video rất dễ theo dõi.',
                studentId: students[0].id,
                enrollmentId: enrollments[3].id, // student[0] -> course6
            },
        }),
        prisma.review.create({
            data: {
                rating: 4,
                comment: 'Nội dung cơ bản nhưng đầy đủ. Phù hợp cho beginner.',
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
                text: 'Video rất hay ạ! Có thể giải thích thêm về virtual DOM không thầy?',
                authorId: students[0].id,
                contentId: firstContent.id,
            },
        }),
        prisma.comment.create({
            data: {
                text: 'Cảm ơn thầy, em đã hiểu React là gì rồi ạ!',
                authorId: students[1].id,
                contentId: firstContent.id,
            },
        }),
        prisma.comment.create({
            data: {
                text: 'Thầy ơi, phần tiếp theo bao giờ ra ạ?',
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