import { randomUUID } from 'crypto';
import { embeddingService } from './embedding.service';

export interface VectorDocument {
    id: string;
    content: string;
    metadata: {
        courseId: number;
        courseTitle: string;
        type: 'course' | 'module' | 'content' | 'syllabus';
        namespace?: string;
        [key: string]: any;
    };
    embedding: number[];
}

/**
 * In-memory vector store for document retrieval
 * For production, consider using ChromaDB, Pinecone, or Qdrant
 */
class VectorStoreService {
    private documents: VectorDocument[] = [];
    private isInitialized = false;

    /**
     * Add a document to the vector store
     */
    async addDocument(
        content: string,
        metadata: VectorDocument['metadata']
    ): Promise<string> {
        const id = randomUUID();
        const embedding = await embeddingService.generateEmbedding(content);

        const document: VectorDocument = {
            id,
            content,
            metadata,
            embedding,
        };

        this.documents.push(document);
        return id;
    }

    /**
     * Add multiple documents to the vector store
     */
    async addDocuments(
        documents: Array<{
            content: string;
            metadata: VectorDocument['metadata'];
        }>
    ): Promise<string[]> {
        const ids: string[] = [];

        for (const doc of documents) {
            const id = await this.addDocument(doc.content, doc.metadata);
            ids.push(id);
        }

        return ids;
    }

    /**
     * Search for similar documents using cosine similarity
     */
    async search(
        query: string,
        topK: number = 5,
        filter?: { courseId?: number; type?: string; namespace?: string }
    ): Promise<Array<{ document: VectorDocument; score: number }>> {
        const queryEmbedding = await embeddingService.generateEmbedding(query);

        // Filter documents if criteria provided
        let filteredDocs = this.documents;
        if (filter) {
            filteredDocs = this.documents.filter((doc) => {
                if (filter.courseId && doc.metadata.courseId !== filter.courseId) {
                    return false;
                }
                if (filter.type && doc.metadata.type !== filter.type) {
                    return false;
                }
                if (filter.namespace && doc.metadata.namespace !== filter.namespace) {
                    return false;
                }
                return true;
            });
        }

        // Calculate similarity scores
        const results = filteredDocs.map((doc) => ({
            document: doc,
            score: embeddingService.cosineSimilarity(queryEmbedding, doc.embedding),
        }));

        // Sort by score (descending) and return top K
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Clear all documents from the store
     */
    clear(): void {
        this.documents = [];
        this.isInitialized = false;
    }

    /**
     * Clear documents for a single namespace, e.g. course:12
     */
    clearNamespace(namespace: string): void {
        this.documents = this.documents.filter((doc) => doc.metadata.namespace !== namespace);
    }

    /**
     * Get document count
     */
    getDocumentCount(): number {
        return this.documents.length;
    }

    getNamespaceDocumentCount(namespace: string): number {
        return this.documents.filter((doc) => doc.metadata.namespace === namespace).length;
    }

    /**
     * Mark store as initialized
     */
    setInitialized(value: boolean): void {
        this.isInitialized = value;
    }

    /**
     * Check if store is initialized
     */
    getIsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Get all documents (for debugging)
     */
    getAllDocuments(): VectorDocument[] {
        return this.documents;
    }
}

export const vectorStoreService = new VectorStoreService();

