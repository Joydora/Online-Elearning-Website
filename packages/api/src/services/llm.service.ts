import OpenAI from 'openai';
import type {
    ChatCompletionMessageParam,
    ChatCompletionCreateParamsBase,
} from 'openai/resources/chat/completions';

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const FAST_MODEL = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';
const SMART_MODEL = process.env.GROQ_MODEL_SMART || 'llama-3.3-70b-versatile';

let client: OpenAI | null = null;

function getClient(): OpenAI {
    if (client) return client;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Add it to your environment.');
    }
    client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
    return client;
}

export type LLMTier = 'fast' | 'smart';

export interface ChatOptions {
    messages: ChatCompletionMessageParam[];
    tier?: LLMTier;
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
    maxTokens?: number;
}

function resolveModel(tier?: LLMTier, override?: string): string {
    if (override) return override;
    return tier === 'smart' ? SMART_MODEL : FAST_MODEL;
}

export async function chat(opts: ChatOptions): Promise<string> {
    const model = resolveModel(opts.tier, opts.model);
    const params: ChatCompletionCreateParamsBase = {
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        stream: false,
    };
    if (opts.maxTokens) params.max_tokens = opts.maxTokens;
    if (opts.jsonMode) params.response_format = { type: 'json_object' };

    const response = await getClient().chat.completions.create(params) as Awaited<
        ReturnType<OpenAI['chat']['completions']['create']>
    > & { choices: Array<{ message: { content: string | null } }> };
    return response.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function* chatStream(opts: Omit<ChatOptions, 'jsonMode'>): AsyncGenerator<string, void, unknown> {
    const model = resolveModel(opts.tier, opts.model);
    const stream = await getClient().chat.completions.create({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        stream: true,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });

    for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield delta;
    }
}

export const llmService = { chat, chatStream };
