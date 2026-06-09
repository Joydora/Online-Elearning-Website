import { Ollama } from 'ollama';
import { vectorStoreService } from './vectorStore.service';
import { CourseStatus, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Combines vector search with LLM generation
 */
class RAGService {
    private ollama: Ollama;
    private model: string;

    constructor() {
        // Use IPv4 to avoid IPv6 connection issues
        this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
        this.model = 'gemma3:4b'; // Using gemma3:4b model
    }

    private getCourseNamespace(courseId: number): string {
        return `course:${courseId}`;
    }

    private stringifySyllabus(syllabus: unknown): string {
        if (!syllabus || (typeof syllabus === 'object' && Object.keys(syllabus).length === 0)) {
            return 'Detailed syllabus is not available yet.';
        }

        if (typeof syllabus === 'string') {
            return syllabus;
        }

        try {
            return JSON.stringify(syllabus, null, 2);
        } catch (error) {
            return String(syllabus);
        }
    }

    async assertCourseAccess(courseId: number, userId: number, role?: Role | string): Promise<void> {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true, status: true },
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        if (role === Role.ADMIN || (role === Role.TEACHER && course.teacherId === userId)) {
            return;
        }

        if (role === Role.STUDENT) {
            if (course.status !== CourseStatus.PUBLISHED) {
                throw new Error('COURSE_FORBIDDEN');
            }

            const enrollment = await prisma.enrollment.findUnique({
                where: {
                    studentId_courseId: {
                        studentId: userId,
                        courseId,
                    },
                },
            });

            const hasActiveAccess =
                enrollment?.isActive === true &&
                (enrollment.expiresAt === null || enrollment.expiresAt.getTime() > Date.now());

            if (hasActiveAccess) {
                return;
            }
        }

        throw new Error('COURSE_FORBIDDEN');
    }

    async reingestCourseSyllabus(courseId: number): Promise<{ namespace: string; documentCount: number }> {
        const namespace = this.getCourseNamespace(courseId);

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true,
                        username: true,
                    },
                },
                category: true,
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        contents: {
                            orderBy: { order: 'asc' },
                            include: {
                                questions: {
                                    orderBy: { id: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        vectorStoreService.clearNamespace(namespace);

        const teacherName = `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() || course.teacher.username;
        const syllabusText = this.stringifySyllabus(course.syllabus);

        await vectorStoreService.addDocument(
            `
Course: ${course.title}
Instructor: ${teacherName}
Category: ${course.category.name}
Description: ${course.description}
Syllabus:
${syllabusText}
            `.trim(),
            {
                courseId: course.id,
                courseTitle: course.title,
                type: 'syllabus',
                namespace,
                teacherName,
                category: course.category.name,
            }
        );

        for (const module of course.modules) {
            await vectorStoreService.addDocument(
                `
Course: ${course.title}
Module ${module.order}: ${module.title}
Related syllabus:
${syllabusText}
                `.trim(),
                {
                    courseId: course.id,
                    courseTitle: course.title,
                    type: 'module',
                    namespace,
                    moduleTitle: module.title,
                    moduleOrder: module.order,
                }
            );

            for (const content of module.contents) {
                const questionText = content.questions
                    .map((question, index) => `Question ${index + 1}: ${question.questionText}`)
                    .join('\n');

                await vectorStoreService.addDocument(
                    `
Course: ${course.title}
Module: ${module.title}
Lesson: ${content.title}
Type: ${content.contentType}
Order: ${content.order}
${questionText ? `Existing quiz questions:\n${questionText}` : ''}
Course syllabus:
${syllabusText}
                    `.trim(),
                    {
                        courseId: course.id,
                        courseTitle: course.title,
                        type: 'content',
                        namespace,
                        moduleTitle: module.title,
                        contentId: content.id,
                        contentTitle: content.title,
                        contentType: content.contentType,
                    }
                );
            }
        }

        return {
            namespace,
            documentCount: vectorStoreService.getNamespaceDocumentCount(namespace),
        };
    }

    private async ensureCourseNamespace(courseId: number): Promise<string> {
        const namespace = this.getCourseNamespace(courseId);

        if (vectorStoreService.getNamespaceDocumentCount(namespace) === 0) {
            await this.reingestCourseSyllabus(courseId);
        }

        return namespace;
    }

    /**
     * Initialize vector store with course data
     */
    async initializeVectorStore(): Promise<void> {
        console.log('🔄 Initializing vector store with course data...');

        // Clear existing documents
        vectorStoreService.clear();

        // Fetch all courses with related data
        const courses = await prisma.course.findMany({
            include: {
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true,
                        username: true,
                    },
                },
                category: true,
                modules: {
                    include: {
                        contents: true,
                    },
                },
            },
        });

        console.log(`📚 Found ${courses.length} courses to index`);

        // Create documents for each course
        for (const course of courses) {
            // 1. Course overview document
            const courseContent = `
Course: ${course.title}
Instructor: ${course.teacher.firstName} ${course.teacher.lastName} (${course.teacher.username})
Category: ${course.category.name}
Description: ${course.description}
Price: ${course.price === 0 ? 'Free' : `$${course.price}`}
            `.trim();

            await vectorStoreService.addDocument(courseContent, {
                courseId: course.id,
                courseTitle: course.title,
                type: 'course',
                namespace: this.getCourseNamespace(course.id),
                teacherName: `${course.teacher.firstName} ${course.teacher.lastName}`,
                category: course.category.name,
                price: course.price,
            });

            // 2. Module documents
            for (const module of course.modules) {
                const moduleContent = `
Course: ${course.title}
Module: ${module.title}
Order: ${module.order}
                `.trim();

                await vectorStoreService.addDocument(moduleContent, {
                    courseId: course.id,
                    courseTitle: course.title,
                    type: 'module',
                    namespace: this.getCourseNamespace(course.id),
                    moduleTitle: module.title,
                    moduleOrder: module.order,
                });

                // 3. Content documents
                for (const content of module.contents) {
                    const contentText = `
Course: ${course.title}
Module: ${module.title}
Lesson: ${content.title}
Type: ${content.contentType}
Order: ${content.order}
                    `.trim();

                    await vectorStoreService.addDocument(contentText, {
                        courseId: course.id,
                        courseTitle: course.title,
                        type: 'content',
                        namespace: this.getCourseNamespace(course.id),
                        moduleTitle: module.title,
                        contentTitle: content.title,
                        contentType: content.contentType,
                    });
                }
            }
        }

        vectorStoreService.setInitialized(true);
        console.log(`✅ Vector store initialized with ${vectorStoreService.getDocumentCount()} documents`);
    }

    /**
     * Generate answer using RAG pipeline
     */
    async generateAnswer(
        question: string,
        courseId?: number
    ): Promise<{
        answer: string;
        sources: Array<{
            courseTitle: string;
            content: string;
            score: number;
        }>;
    }> {
        // Check if vector store is initialized
        if (!vectorStoreService.getIsInitialized()) {
            await this.initializeVectorStore();
        }

        // 1. Retrieve relevant documents
        const searchResults = await vectorStoreService.search(
            question,
            5,
            courseId ? { courseId } : undefined
        );

        // 2. Prepare context from retrieved documents
        const context = searchResults
            .map((result, idx) => `[Document ${idx + 1}]\n${result.document.content}`)
            .join('\n\n');

        // 3. Create prompt for LLM
        const prompt = `You are a smart AI assistant for E-Learning online learning platform. Your task is to answer user questions based on the course information.

Course information:
${context}

Question: ${question}

Please answer the question accurately, helpfully, and friendly. If the information is not available in the documents, state it clearly and suggest the user find out more. Answer in English.

Answer:`;

        // 4. Generate answer using LLM
        const response = await this.ollama.generate({
            model: this.model,
            prompt: prompt,
            stream: false,
        });

        // 5. Prepare sources
        const sources = searchResults.map((result) => ({
            courseTitle: result.document.metadata.courseTitle,
            content: result.document.content,
            score: result.score,
        }));

        return {
            answer: response.response,
            sources,
        };
    }

    /**
     * Stream answer using RAG pipeline
     */
    async *streamAnswer(
        question: string,
        courseId?: number
    ): AsyncGenerator<string, void, unknown> {
        // Check if vector store is initialized
        if (!vectorStoreService.getIsInitialized()) {
            await this.initializeVectorStore();
        }

        // 1. Retrieve relevant documents
        const searchResults = await vectorStoreService.search(
            question,
            5,
            courseId ? { courseId } : undefined
        );

        // 2. Prepare context
        const context = searchResults
            .map((result, idx) => `[Document ${idx + 1}]\n${result.document.content}`)
            .join('\n\n');

        // 3. Create prompt
        const prompt = `You are a smart AI assistant for E-Learning online learning platform. Your task is to answer user questions based on the course information.

Course information:
${context}

Question: ${question}

Please answer the question accurately, helpfully, and friendly. If the information is not available in the documents, state it clearly and suggest the user find out more. Answer in English.

Answer:`;

        // 4. Stream response
        const stream = await this.ollama.generate({
            model: this.model,
            prompt: prompt,
            stream: true,
        });

        for await (const chunk of stream) {
            yield chunk.response;
        }
    }

    async askTeachingAssistant(input: {
        courseId: number;
        question: string;
        currentContentId?: number;
        userId: number;
        role?: Role | string;
    }): Promise<{
        answer: string;
        sources: Array<{
            content: string;
            score: number;
        }>;
    }> {
        await this.assertCourseAccess(input.courseId, input.userId, input.role);
        const namespace = await this.ensureCourseNamespace(input.courseId);

        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: {
                title: true,
                description: true,
                syllabus: true,
            },
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        const currentContent = input.currentContentId
            ? await prisma.content.findUnique({
                where: { id: input.currentContentId },
                select: {
                    id: true,
                    title: true,
                    contentType: true,
                    module: {
                        select: {
                            courseId: true,
                            title: true,
                        },
                    },
                },
            })
            : null;

        if (currentContent && currentContent.module.courseId !== input.courseId) {
            throw new Error('CONTENT_NOT_IN_COURSE');
        }

        const searchQuery = currentContent
            ? `${input.question}\nCurrently viewing lesson: ${currentContent.title}`
            : input.question;

        const searchResults = await vectorStoreService.search(searchQuery, 6, { namespace });
        const context = searchResults
            .map((result, index) => `[Source ${index + 1}]\n${result.document.content}`)
            .join('\n\n');

        const prompt = `You are the instructor for the course "${course.title}", not a general chatbot.

SYLLABUS SCOPE:
${this.stringifySyllabus(course.syllabus)}

COURSE CONTEXT:
${course.description}

${currentContent ? `CURRENTLY VIEWING LESSON: ${currentContent.module.title} - ${currentContent.title} (${currentContent.contentType})` : ''}

RETRIEVED DOCUMENTS:
${context || 'No matching documents retrieved.'}

RULES:
1. Only answer within the scope of the syllabus and course materials above.
2. If the question is outside the syllabus, state clearly that it is outside the course scope.
3. Answer as an instructor: accurately, comprehensibly, with short examples when appropriate.
4. Answer in English.

STUDENT QUESTION: ${input.question}

ANSWER:`;

        const response = await this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
        });

        return {
            answer: response.response,
            sources: searchResults.map((result) => ({
                content: result.document.content,
                score: result.score,
            })),
        };
    }

    async generateQuizSuggestions(input: {
        courseId: number;
        currentContentId?: number;
        userId: number;
        role?: Role | string;
    }): Promise<{ suggestions: string }> {
        await this.assertCourseAccess(input.courseId, input.userId, input.role);
        const namespace = await this.ensureCourseNamespace(input.courseId);

        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: {
                title: true,
                syllabus: true,
            },
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        const currentContent = input.currentContentId
            ? await prisma.content.findUnique({
                where: { id: input.currentContentId },
                select: {
                    title: true,
                    contentType: true,
                    module: {
                        select: {
                            courseId: true,
                            title: true,
                        },
                    },
                },
            })
            : null;

        if (currentContent && currentContent.module.courseId !== input.courseId) {
            throw new Error('CONTENT_NOT_IN_COURSE');
        }

        const query = currentContent
            ? `Create quiz questions for lesson ${currentContent.title}`
            : `Create quiz questions for course ${course.title}`;
        const searchResults = await vectorStoreService.search(query, 5, { namespace });
        const context = searchResults.map((result) => result.document.content).join('\n\n');

        const prompt = `You are the instructor for the course "${course.title}".

SYLLABUS:
${this.stringifySyllabus(course.syllabus)}

${currentContent ? `Lesson for quiz suggestions: ${currentContent.module.title} - ${currentContent.title} (${currentContent.contentType})` : ''}

CONTEXT:
${context}

Please generate 5 multiple choice questions within the scope of the syllabus. Each question should include:
- Question
- 4 options A/B/C/D
- Correct answer
- Short explanation

Answer in English, using Markdown format.`;

        const response = await this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
        });

        return { suggestions: response.response };
    }
}

export const ragService = new RAGService();

