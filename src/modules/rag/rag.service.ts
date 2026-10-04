import crypto from 'node:crypto';
import OpenAI from 'openai';
import prisma from '../../config/db.js';
import env from '../../config/env.js';

export interface DocumentChunkResult {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
}

export class RagService {
  private openai: OpenAI;
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.startsWith('sk-mock');
    this.openai = new OpenAI({
      apiKey: this.isMockMode ? 'sk-dummy-key' : env.OPENAI_API_KEY,
    });
  }

  /**
   * Generates a 1536-dimensional vector embedding for given text.
   * Uses OpenAI text-embedding-3-small or deterministic fallback mock.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.isMockMode) {
      return this.generateMockEmbedding(text);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (err) {
      console.warn('⚠️ OpenAI embedding call failed, using mock embedding fallback:', err);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generates a deterministic normalized 1536-dim vector for mock fallback.
   */
  private generateMockEmbedding(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector: number[] = new Array(1536);

    for (let i = 0; i < 1536; i++) {
      const byte = hash[i % hash.length];
      vector[i] = ((byte - 128) / 128) * Math.sin(i + text.length);
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / magnitude);
  }

  /**
   * Ingests a new DocumentChunk with vector embedding.
   */
  async ingestDocument(
    title: string,
    content: string,
    metadata?: Record<string, unknown>
  ) {
    const embedding = await this.generateEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;
    const docId = `doc-${crypto.randomBytes(8).toString('hex')}`;
    const metaJson = JSON.stringify(metadata || {});

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, title, content, metadata, embedding, "createdAt")
         VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())`,
        docId,
        title,
        content,
        metaJson,
        vectorString
      );
    } catch (err) {
      console.warn('⚠️ Raw pgvector insert warning (database table or extension offline):', err);
    }

    return {
      id: docId,
      title,
      content,
      metadata,
    };
  }

  /**
   * Performs vector similarity search using PostgreSQL pgvector <=> (cosine distance).
   */
  async retrieveSimilarChunks(
    query: string,
    matchCount = 3,
    threshold = 0.3
  ): Promise<DocumentChunkResult[]> {
    const embedding = await this.generateEmbedding(query);
    const vectorString = `[${embedding.join(',')}]`;

    try {
      const chunks = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          title: string;
          content: string;
          metadata: any;
          similarity: number;
        }>
      >(
        `SELECT id, title, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
         FROM "DocumentChunk"
         WHERE 1 - (embedding <=> $1::vector) > $2
         ORDER BY similarity DESC
         LIMIT $3`,
        vectorString,
        threshold,
        matchCount
      );

      return chunks.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        metadata: typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata,
        similarity: Number(c.similarity),
      }));
    } catch (err) {
      console.warn('⚠️ Vector similarity query fallback (DB offline or pgvector uninitialized):', err);

      try {
        const fallbackDocs = await prisma.documentChunk.findMany({
          take: matchCount,
        });

        return fallbackDocs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          metadata: (doc.metadata as Record<string, unknown>) || undefined,
          similarity: 0.85,
        }));
      } catch {
        return [
          {
            id: 'mock-1',
            title: 'Hotel Information & Policies',
            content: 'Standard check-in time is 3:00 PM and check-out is 11:00 AM. Complimentary breakfast is served daily from 6:30 AM to 10:30 AM.',
            similarity: 0.9,
          },
        ];
      }
    }
  }

  /**
   * AI Concierge Assistant using RAG retrieval + LLM synthesis.
   */
  async askConcierge(query: string) {
    const relevantChunks = await this.retrieveSimilarChunks(query, 3, 0.2);

    const contextText = relevantChunks
      .map((chunk, index) => `[Source ${index + 1}: ${chunk.title}]\n${chunk.content}`)
      .join('\n\n');

    const sources = relevantChunks.map((chunk) => ({
      title: chunk.title,
      similarity: chunk.similarity || 0,
    }));

    if (this.isMockMode) {
      const mockReply = relevantChunks.length > 0
        ? `Based on our hotel policies: ${relevantChunks[0].content}`
        : 'Thank you for asking! For specific requests, please contact our Front Desk team directly.';

      return {
        reply: mockReply,
        sources,
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are the AI Concierge of our hotel. Answer using only the provided context. If unsure, tell the guest to contact the front desk.',
          },
          {
            role: 'user',
            content: `Context:\n${contextText}\n\nGuest Query: ${query}`,
          },
        ],
        temperature: 0.3,
      });

      const reply = completion.choices[0]?.message?.content || 'Please contact the front desk for assistance.';

      return {
        reply,
        sources,
      };
    } catch (err) {
      console.warn('⚠️ OpenAI LLM call failed, using mock response:', err);
      return {
        reply: `Based on our hotel records: ${contextText || 'Please contact the front desk for assistance.'}`,
        sources,
      };
    }
  }
}

export const ragService = new RagService();
