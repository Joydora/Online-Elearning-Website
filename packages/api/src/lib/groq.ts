import Groq from 'groq-sdk';

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MODEL_FAST = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';
export const GROQ_MODEL_SMART = process.env.GROQ_MODEL_SMART || 'llama-3.3-70b-versatile';
