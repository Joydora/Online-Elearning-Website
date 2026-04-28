import { Ollama } from 'ollama';

/**
 * Service for generating embeddings using Ollama
 */
class EmbeddingService {
    private ollama: Ollama;
    private model: string;
    private readonly fallbackDimensions = 384;

    constructor() {
        // Initialize Ollama client (use IPv4 to avoid IPv6 connection issues)
        this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
        this.model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
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
            .replace(/[\u0300-\u036f]/g, '')
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

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.ollama.embeddings({
                model: this.model,
                prompt: text,
            });

            return response.embedding;
        } catch (error) {
            console.warn(
                `Ollama embedding model "${this.model}" unavailable; using local fallback embedding.`,
                (error as Error).message
            );
            return this.generateFallbackEmbedding(text);
        }
    }

    /**
     * Generate embeddings for multiple texts
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];

        for (const text of texts) {
            const embedding = await this.generateEmbedding(text);
            embeddings.push(embedding);
        }

        return embeddings;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
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

