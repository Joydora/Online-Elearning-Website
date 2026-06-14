// Groq does not provide an embeddings API.
// We use a deterministic hash-based fallback that works without any external service.

class EmbeddingService {
    private readonly fallbackDimensions = 384;

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
        return this.generateFallbackEmbedding(text);
    }

    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        return texts.map((t) => this.generateFallbackEmbedding(t));
    }

    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) throw new Error('Vectors must have the same length');

        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const embeddingService = new EmbeddingService();
