import { Router } from 'express';
import {
    askTeachingAssistantController,
    initializeVectorStoreController,
    askQuestionController,
    askQuestionStreamController,
    generateQuizSuggestionsController,
    getVectorStoreStatsController,
} from '../controllers/chatbot.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

// Initialize vector store (admin only - should be protected in production)
router.post('/chatbot/initialize', initializeVectorStoreController);

// Ask a question (regular response)
router.post('/chatbot/ask', askQuestionController);

// Ask a question (streaming response)
router.post('/chatbot/ask/stream', askQuestionStreamController);

// Get vector store statistics
router.get('/chatbot/stats', getVectorStoreStatsController);

// Course-scoped AI Teaching Assistant
router.post('/ta/:courseId/ask', isAuthenticated, askTeachingAssistantController);
router.post('/ta/:courseId/quiz-suggestions', isAuthenticated, generateQuizSuggestionsController);

export default router;

