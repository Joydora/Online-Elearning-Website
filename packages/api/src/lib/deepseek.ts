import OpenAI from 'openai';

export const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseURL: 'https://api.deepseek.com',
});

export const DEEPSEEK_MODEL_FAST = process.env.DEEPSEEK_MODEL_FAST ?? 'deepseek-chat';
export const DEEPSEEK_MODEL_SMART = process.env.DEEPSEEK_MODEL_SMART ?? 'deepseek-chat';
