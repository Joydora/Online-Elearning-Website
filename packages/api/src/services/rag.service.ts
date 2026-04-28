import { Ollama } from 'ollama';
import { vectorStoreService } from './vectorStore.service';
import { PrismaClient, Role } from '@prisma/client';

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
            return 'Chưa có syllabus chi tiết.';
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
            select: { teacherId: true },
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        if (role === Role.ADMIN || (role === Role.TEACHER && course.teacherId === userId)) {
            return;
        }

        if (role === Role.STUDENT) {
            const enrollment = await prisma.enrollment.findUnique({
                where: {
                    studentId_courseId: {
                        studentId: userId,
                        courseId,
                    },
                },
            });

            if (enrollment) {
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
Khóa học: ${course.title}
Giảng viên: ${teacherName}
Danh mục: ${course.category.name}
Mô tả: ${course.description}
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
Khóa học: ${course.title}
Chương ${module.order}: ${module.title}
Syllabus liên quan:
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
                    .map((question, index) => `Câu hỏi ${index + 1}: ${question.questionText}`)
                    .join('\n');

                await vectorStoreService.addDocument(
                    `
Khóa học: ${course.title}
Chương: ${module.title}
Bài học: ${content.title}
Loại: ${content.contentType}
Thứ tự: ${content.order}
${questionText ? `Câu hỏi quiz hiện có:\n${questionText}` : ''}
Syllabus khóa học:
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
Khóa học: ${course.title}
Giảng viên: ${course.teacher.firstName} ${course.teacher.lastName} (${course.teacher.username})
Danh mục: ${course.category.name}
Mô tả: ${course.description}
Giá: ${course.price === 0 ? 'Miễn phí' : `${course.price} VND`}
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
Khóa học: ${course.title}
Chương: ${module.title}
Thứ tự: ${module.order}
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
Khóa học: ${course.title}
Chương: ${module.title}
Bài học: ${content.title}
Loại: ${content.contentType}
Thứ tự: ${content.order}
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
            .map((result, idx) => `[Tài liệu ${idx + 1}]\n${result.document.content}`)
            .join('\n\n');

        // 3. Create prompt for LLM
        const prompt = `Bạn là một trợ lý AI thông minh cho nền tảng học trực tuyến E-Learning. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên thông tin về các khóa học.

Thông tin khóa học:
${context}

Câu hỏi: ${question}

Hãy trả lời câu hỏi một cách chính xác, hữu ích và thân thiện. Nếu thông tin không có trong tài liệu, hãy nói rõ và đề xuất người dùng tìm hiểu thêm. Trả lời bằng tiếng Việt.

Trả lời:`;

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
            .map((result, idx) => `[Tài liệu ${idx + 1}]\n${result.document.content}`)
            .join('\n\n');

        // 3. Create prompt
        const prompt = `Bạn là một trợ lý AI thông minh cho nền tảng học trực tuyến E-Learning. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên thông tin về các khóa học.

Thông tin khóa học:
${context}

Câu hỏi: ${question}

Hãy trả lời câu hỏi một cách chính xác, hữu ích và thân thiện. Nếu thông tin không có trong tài liệu, hãy nói rõ và đề xuất người dùng tìm hiểu thêm. Trả lời bằng tiếng Việt.

Trả lời:`;

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
            ? `${input.question}\nBài đang xem: ${currentContent.title}`
            : input.question;

        const searchResults = await vectorStoreService.search(searchQuery, 6, { namespace });
        const context = searchResults
            .map((result, index) => `[Nguồn ${index + 1}]\n${result.document.content}`)
            .join('\n\n');

        const prompt = `Bạn là giảng viên môn "${course.title}", không phải chatbot chung.

PHẠM VI SYLLABUS:
${this.stringifySyllabus(course.syllabus)}

NGỮ CẢNH KHÓA HỌC:
${course.description}

${currentContent ? `BÀI HỌC ĐANG XEM: ${currentContent.module.title} - ${currentContent.title} (${currentContent.contentType})` : ''}

TÀI LIỆU TRUY XUẤT:
${context || 'Không có tài liệu truy xuất phù hợp.'}

QUY TẮC:
1. Chỉ trả lời trong phạm vi syllabus và tài liệu khóa học ở trên.
2. Nếu câu hỏi nằm ngoài syllabus, nói rõ rằng nội dung đó nằm ngoài phạm vi môn học.
3. Trả lời như một giảng viên: chính xác, dễ hiểu, có ví dụ ngắn khi phù hợp.
4. Trả lời bằng tiếng Việt.

CÂU HỎI CỦA HỌC VIÊN: ${input.question}

TRẢ LỜI:`;

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
            ? `Tạo câu hỏi quiz cho bài ${currentContent.title}`
            : `Tạo câu hỏi quiz cho khóa học ${course.title}`;
        const searchResults = await vectorStoreService.search(query, 5, { namespace });
        const context = searchResults.map((result) => result.document.content).join('\n\n');

        const prompt = `Bạn là giảng viên môn "${course.title}".

SYLLABUS:
${this.stringifySyllabus(course.syllabus)}

${currentContent ? `Bài học cần gợi ý quiz: ${currentContent.module.title} - ${currentContent.title} (${currentContent.contentType})` : ''}

NGỮ CẢNH:
${context}

Hãy tạo 5 câu hỏi trắc nghiệm gợi ý trong phạm vi syllabus. Mỗi câu gồm:
- Câu hỏi
- 4 lựa chọn A/B/C/D
- Đáp án đúng
- Giải thích ngắn

Trả lời bằng tiếng Việt, định dạng Markdown.`;

        const response = await this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
        });

        return { suggestions: response.response };
    }
}

export const ragService = new RAGService();

