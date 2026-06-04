import { PrismaClient } from '@prisma/client';
import { llmService } from './llm.service';

const prisma = new PrismaClient();

function stringifySyllabus(syllabus: unknown): string {
    if (!syllabus || (typeof syllabus === 'object' && Object.keys(syllabus).length === 0)) {
        return 'Chưa có syllabus chi tiết.';
    }
    if (typeof syllabus === 'string') {
        return syllabus;
    }
    return JSON.stringify(syllabus, null, 2);
}

/**
 * Simple Chatbot Service (without embeddings/RAG)
 * Loads all course data and uses LLM with full context.
 */
class SimpleChatbotService {
    private courseContext: string = '';
    private isInitialized: boolean = false;

    async initialize(): Promise<void> {
        console.log('🔄 Loading course data for chatbot...');

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

        console.log(`📚 Found ${courses.length} courses`);

        const contextParts: string[] = [];

        for (const course of courses) {
            const teacherName = `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() || course.teacher.username;

            let courseInfo = `
=== KHÓA HỌC: ${course.title} ===
- ID: ${course.id}
- Giảng viên: ${teacherName}
- Danh mục: ${course.category.name}
- Mô tả: ${course.description}
- Syllabus: ${stringifySyllabus(course.syllabus)}
- Giá: ${course.price === 0 ? 'Miễn phí' : `${course.price} VND`}
- Số chương: ${course.modules.length}
`;

            if (course.modules.length > 0) {
                courseInfo += '\nCác chương học:\n';
                for (const module of course.modules) {
                    courseInfo += `  ${module.order}. ${module.title} (${module.contents.length} bài học)\n`;
                    for (const content of module.contents) {
                        courseInfo += `     - ${content.title} (${content.contentType})\n`;
                    }
                }
            }

            contextParts.push(courseInfo);
        }

        this.courseContext = contextParts.join('\n');
        this.isInitialized = true;
        console.log('✅ Chatbot initialized successfully!');
    }

    private buildPrompt(question: string): string {
        return `Bạn là trợ lý AI thân thiện cho E-Learning Platform.

DỮ LIỆU KHÓA HỌC HIỆN CÓ:
${this.courseContext}

QUY TẮC:
1. Với lời chào/câu hỏi chung → Trả lời tự nhiên, thân thiện, giới thiệu bạn có thể giúp gì
2. Với câu hỏi về khóa học → CHỈ dựa vào DỮ LIỆU TRÊN, không bịa thêm
3. KHÔNG tạo link giả (example.com)
4. Nếu khóa học không tồn tại → Nói thẳng "chưa có"
5. Trả lời ngắn gọn, chính xác, tiếng Việt

CÂU HỎI: ${question}

TRẢ LỜI:`;
    }

    async generateAnswer(question: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            return await llmService.chat({
                messages: [{ role: 'user', content: this.buildPrompt(question) }],
                tier: 'fast',
                temperature: 0.7,
            });
        } catch (error) {
            console.error('Error generating answer:', error);
            throw new Error('Không thể tạo câu trả lời. Vui lòng thử lại sau.');
        }
    }

    async *streamAnswer(question: string): AsyncGenerator<string, void, unknown> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            for await (const chunk of llmService.chatStream({
                messages: [{ role: 'user', content: this.buildPrompt(question) }],
                tier: 'fast',
                temperature: 0.7,
            })) {
                yield chunk;
            }
        } catch (error) {
            console.error('Error streaming answer:', error);
            throw new Error('Không thể tạo câu trả lời. Vui lòng thử lại sau.');
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    getStats() {
        return {
            isInitialized: this.isInitialized,
            contextLength: this.courseContext.length,
        };
    }
}

export const simpleChatbotService = new SimpleChatbotService();
