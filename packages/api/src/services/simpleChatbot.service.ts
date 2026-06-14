import { groq, GROQ_MODEL_FAST } from '../lib/groq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stringifySyllabus(syllabus: unknown): string {
    if (!syllabus || (typeof syllabus === 'object' && Object.keys(syllabus).length === 0)) {
        return 'Detailed syllabus is not available yet.';
    }

    if (typeof syllabus === 'string') {
        return syllabus;
    }

    return JSON.stringify(syllabus, null, 2);
}

/**
 * Simple Chatbot Service (without embeddings/RAG)
 * Just loads all course data and uses LLM with full context
 */
class SimpleChatbotService {
    private courseContext: string = '';
    private isInitialized: boolean = false;

    /**
     * Load all course data into context
     */
    async initialize(): Promise<void> {
        console.log('🔄 Loading course data for chatbot...');

        const courses = await prisma.course.findMany({
            where: { status: 'PUBLISHED' },
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

        // Build context string with all course information
        const contextParts: string[] = [];

        for (const course of courses) {
            const teacherName = `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() || course.teacher.username;
            
            let courseInfo = `
=== COURSE: ${course.title} ===
- ID: ${course.id}
- Instructor: ${teacherName}
- Category: ${course.category.name}
- Description: ${course.description}
- Syllabus: ${stringifySyllabus(course.syllabus)}
- Price: ${course.price === 0 ? 'Free' : `$${course.price}`}
- Modules count: ${course.modules.length}
`;

            // Add module information
            if (course.modules.length > 0) {
                courseInfo += '\nModules:\n';
                for (const module of course.modules) {
                    courseInfo += `  ${module.order}. ${module.title} (${module.contents.length} lessons)\n`;
                    
                    // Add content titles
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

    /**
     * Generate answer using LLM with full course context
     */
    async generateAnswer(question: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const prompt = `You are a friendly AI assistant for E-Learning Platform. 

AVAILABLE COURSE DATA:
${this.courseContext}

RULES:
1. For general greetings/questions → Answer naturally, friendly, introduce how you can help
2. For questions about courses → ONLY rely on the ABOVE DATA, do not make up information
3. DO NOT create fake links (example.com)
4. If a course does not exist → Say directly that it is not available yet
5. Answer concisely and accurately in English

QUESTION: ${question}

ANSWER:`;

        try {
            const response = await groq.chat.completions.create({
                model: GROQ_MODEL_FAST,
                messages: [{ role: 'user', content: prompt }],
            });

            return response.choices[0].message.content ?? '';
        } catch (error) {
            console.error('Error generating answer:', error);
            throw new Error('Could not generate answer. Please try again later.');
        }
    }

    /**
     * Stream answer using LLM
     */
    async *streamAnswer(question: string): AsyncGenerator<string, void, unknown> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const prompt = `You are a friendly AI assistant for E-Learning Platform. 

AVAILABLE COURSE DATA:
${this.courseContext}

RULES:
1. For general greetings/questions → Answer naturally, friendly, introduce how you can help
2. For questions about courses → ONLY rely on the ABOVE DATA, do not make up information
3. DO NOT create fake links (example.com)
4. If a course does not exist → Say directly that it is not available yet
5. Answer concisely and accurately in English

QUESTION: ${question}

ANSWER:`;

        try {
            const stream = await groq.chat.completions.create({
                model: GROQ_MODEL_FAST,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
            });

            for await (const chunk of stream) {
                yield chunk.choices[0]?.delta?.content ?? '';
            }
        } catch (error) {
            console.error('Error streaming answer:', error);
            throw new Error('Could not generate answer. Please try again later.');
        }
    }

    /**
     * Check if initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            contextLength: this.courseContext.length,
        };
    }
}

export const simpleChatbotService = new SimpleChatbotService();

