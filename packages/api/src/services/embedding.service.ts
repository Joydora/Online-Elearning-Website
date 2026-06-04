import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

class EmbeddingService {
    private client: GoogleGenerativeAI | null = null;
    private readonly fallbackDimensions = 768;

    private getClient(): GoogleGenerativeAI | null {
        if (this.client) return this.client;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return null;
        this.client = new GoogleGenerativeAI(apiKey);
        return this.client;
    }

    private hashToken(token: string): number {
        let hash = 2166136261;
        for (let i = 0; i < token.length; i++) {
            hash ^= token.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    private generateFallbackEmbedding(text: string): number[] {
        const vector = new Array(this.fallbackDimensions).fill(0);
        const tokens = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .split(/[^a-z0-9]+/)
            .filter(Boolean);

        if (tokens.length === 0) {
            vector[0] = 1;
            return vector;
        }

        for (const token of tokens) {
            const hash = this.hashToken(token);
            const index = hash % this.fallbackDimensions;
            vector[index] += 1;
        }

        return vector;
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const client = this.getClient();
        if (!client) {
            return this.generateFallbackEmbedding(text);
        }
        try {
            const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
            const result = await model.embedContent(text);
            const values = result.embedding?.values;
            if (!values || values.length === 0) {
                return this.generateFallbackEmbedding(text);
            }
            return values;
        } catch (error) {
            console.warn(
                `Gemini embedding "${EMBEDDING_MODEL}" failed; using local fallback.`,
                (error as Error).message,
            );
            return this.generateFallbackEmbedding(text);
        }
    }

    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];
        for (const text of texts) {
            embeddings.push(await this.generateEmbedding(text));
        }
        return embeddings;
    }

    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const embeddingService = new EmbeddingService();
