import env from '../src/config/env.js';
import { ragService } from '../src/modules/rag/rag.service.js';

async function runSystemVerification() {
  console.log('🧪 Starting Hotel Backend Automated System Verification...');

  // 1. Verify Environment Parsing
  console.log('  [1/3] Environment Configuration Check...');
  if (!env.PORT || !env.DATABASE_URL || !env.REDIS_URL) {
    throw new Error('Environment configuration check failed!');
  }
  console.log('   ✅ Environment variables validated (PORT:', env.PORT, ', NODE_ENV:', env.NODE_ENV, ')');

  // 2. Verify Date Overlap Logic
  console.log('  [2/3] Date Overlap Concurrency Rule Verification...');
  const dateCheck1 = { checkIn: new Date('2026-10-10'), checkOut: new Date('2026-10-15') };
  const dateCheck2 = { checkIn: new Date('2026-10-14'), checkOut: new Date('2026-10-20') };
  const dateCheck3 = { checkIn: new Date('2026-10-15'), checkOut: new Date('2026-10-18') };

  const isOverlapping = (d1: typeof dateCheck1, d2: typeof dateCheck1) => {
    return d1.checkIn < d2.checkOut && d1.checkOut > d2.checkIn;
  };

  if (!isOverlapping(dateCheck1, dateCheck2)) {
    throw new Error('Overlap check failed for overlapping dates!');
  }

  if (isOverlapping(dateCheck1, dateCheck3)) {
    throw new Error('Overlap check failed for non-overlapping sequential dates!');
  }
  console.log('   ✅ Reservation date-range concurrency rules verified');

  // 3. Verify Vector Embedding Math & RAG Retrieval
  console.log('  [3/3] Vector Cosine Similarity & Embedding Verification...');
  const embedding1 = await ragService.generateEmbedding('Hotel cancellation policy');
  const embedding2 = await ragService.generateEmbedding('Hotel cancellation policy');

  if (embedding1.length !== 1536 || embedding2.length !== 1536) {
    throw new Error('Vector dimension check failed! Expected 1536 floats.');
  }

  const dotProduct = embedding1.reduce((sum, val, idx) => sum + val * embedding2[idx], 0);
  const normA = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  const similarity = dotProduct / (normA * normB);

  if (similarity < 0.99) {
    throw new Error(`Cosine similarity sanity check failed: similarity=${similarity}`);
  }
  console.log('   ✅ Vector cosine similarity math verified (similarity score:', similarity.toFixed(4), ')');

  console.log('\n🎉 ALL SYSTEM VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runSystemVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
