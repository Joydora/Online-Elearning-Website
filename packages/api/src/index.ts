import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import uploadRoutes from './routes/upload.routes';
import enrollRoutes from './routes/enroll.routes';
import quizRoutes from './routes/quiz.routes';
import questionRoutes from './routes/question.routes';
import commentRoutes from './routes/comment.routes';
import chatbotRoutes from './routes/chatbot.routes';
import adminRoutes from './routes/admin.routes';
import progressRoutes from './routes/progress.routes';
import teacherRoutes from './routes/teacher.routes';
import contactRoutes from './routes/contact.routes';
import reviewRoutes from './routes/review.routes';
import userRoutes from './routes/user.routes';
import passwordRoutes from './routes/password.routes';
import promotionRoutes from './routes/promotion.routes';
import recommendRoutes from './routes/recommend.routes';
import practiceRoutes from './routes/practice.routes';
import projectRoutes from './routes/project.routes';
import syllabusRoutes from './routes/syllabus.routes';
import { simpleChatbotService } from './services/simpleChatbot.service';
import { startEnrollmentExpiryJob } from './jobs/expireEnrollments';
import './config/passport'; // Initialize passport strategies

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const prisma = new PrismaClient();

app.use(cors({
    origin: frontendOrigin,
    credentials: true,
}));
app.use(express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res, buffer) => {
        if (req.originalUrl === '/api/stripe-webhook') {
            req.rawBody = buffer;
        }
    },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', uploadRoutes);
app.use('/api', enrollRoutes);
app.use('/api', quizRoutes);
app.use('/api', questionRoutes);
app.use('/api', commentRoutes);
app.use('/api', chatbotRoutes);
app.use('/api', adminRoutes);
app.use('/api', progressRoutes);
app.use('/api', teacherRoutes);
app.use('/api', contactRoutes);
app.use('/api', reviewRoutes);
app.use('/api', userRoutes);
app.use('/api', passwordRoutes);
app.use('/api', promotionRoutes);
app.use('/api', recommendRoutes);
app.use('/api', practiceRoutes);
app.use('/api', projectRoutes);
app.use('/api', syllabusRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server for E-Learning Platform');
});

app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database unreachable',
            error: (error as Error).message,
        });
    }
});

const server = app.listen(port, async () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);

    startEnrollmentExpiryJob();

    // Initialize chatbot in background
    try {
        console.log('🤖 Initializing AI Chatbot...');
        await simpleChatbotService.initialize();
        console.log('✅ AI Chatbot initialized successfully!');
    } catch (error) {
        console.error('⚠️  Failed to initialize chatbot:', error);
        console.log('📌 You can manually initialize it by calling POST /api/chatbot/initialize');
    }
});

const shutdown = async () => {
    console.log('Shutting down server...');
    await prisma.$disconnect();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};
 
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
