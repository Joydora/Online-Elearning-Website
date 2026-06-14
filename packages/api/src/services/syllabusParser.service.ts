import { ContentType, PrismaClient, Role } from '@prisma/client';
import { groq, GROQ_MODEL_SMART } from '../lib/groq';
import { ragService } from './rag.service';

const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are a curriculum designer. Given a course syllabus text, extract and structure it into chapters and lessons.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "chapters": [
    {
      "title": "Chapter Title",
      "lessons": [
        { "title": "Lesson Title", "type": "VIDEO", "description": "Brief description" }
      ]
    }
  ]
}
Valid lesson types are: VIDEO, DOCUMENT, QUIZ, PRACTICE, ASSIGNMENT.
Extract all chapters/modules/units and their lessons/topics from the text.`;

export type ParsedLesson = {
    title: string;
    type: string;
    description: string;
};

export type ParsedChapter = {
    title: string;
    lessons: ParsedLesson[];
};

export type ParsedSyllabus = {
    chapters: ParsedChapter[];
};

export async function assertCanManageSyllabusCourse(
    courseId: number,
    userId: number,
    userRole?: Role | string,
): Promise<void> {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!course || (userRole !== Role.ADMIN && course.teacherId !== userId)) {
        throw new Error('FORBIDDEN');
    }
}

export async function parseSyllabus(text: string): Promise<ParsedSyllabus> {
    const response = await groq.chat.completions.create({
        model: GROQ_MODEL_SMART,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Parse this syllabus:\n\n${text}` },
        ],
        temperature: 0.1,
    });

    const content = (response.choices[0].message.content ?? '').trim();
    // Extract JSON from response (handle ```json ... ``` wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.chapters || !Array.isArray(parsed.chapters)) throw new Error('Invalid structure');
    return parsed as ParsedSyllabus;
}

export async function commitSyllabus(
    courseId: number,
    userId: number,
    chapters: ParsedChapter[],
    userRole?: Role | string,
) {
    await assertCanManageSyllabusCourse(courseId, userId, userRole);

    // Create modules and contents in order
    const results = [];
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const createdModule = await prisma.module.create({
            data: { title: chapter.title, order: i + 1, courseId },
        });

        const contents = [];
        const lessons = Array.isArray(chapter.lessons) ? chapter.lessons : [];
        for (let j = 0; j < lessons.length; j++) {
            const lesson = lessons[j];
            const validTypes: ContentType[] = ['VIDEO', 'DOCUMENT', 'QUIZ', 'PRACTICE', 'ASSIGNMENT'];
            const candidateType = (lesson.type || 'VIDEO').toString().toUpperCase() as ContentType;
            const contentType: ContentType = validTypes.includes(candidateType) ? candidateType : 'VIDEO';
            const content = await prisma.content.create({
                data: {
                    title: lesson.title,
                    order: j + 1,
                    contentType,
                    moduleId: createdModule.id,
                },
            });
            contents.push(content);
        }
        results.push({ module: createdModule, contents });
    }

    await prisma.course.update({
        where: { id: courseId },
        data: { syllabus: { chapters } },
    });

    await ragService.reingestCourseSyllabus(courseId);

    return results;
}
