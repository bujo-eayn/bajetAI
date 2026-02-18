/**
 * End-to-End Test: RAG Chat Feature
 *
 * Tests the complete RAG chat pipeline:
 * 1. Document upload
 * 2. Text extraction (Inngest)
 * 3. Summarization (Inngest)
 * 4. Translation (Inngest)
 * 5. Publishing document
 * 6. Embedding generation (Inngest)
 * 7. Chat functionality
 *
 * Prerequisites:
 * - Local dev server running: npm run dev
 * - Inngest dev server running: npx inngest-cli@latest dev
 * - Database migration 014 applied
 * - Valid official user credentials
 *
 * Run with: npx tsx scripts/test-rag-chat-e2e.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
function loadEnvFile(filePath: string): void {
  try {
    const envPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}`);
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // API base URL
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',

  // Supabase config
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // Test document
  testDocumentPath: path.join(
    process.cwd(),
    'dev-docs/example-docs/ADP 2025-2026 COUNTY ASSEMBLY APPROVED FINAL-jNsVO.pdf-0.27947800 1748422924.pdf'
  ),

  // Test credentials (set via environment or use defaults for local testing)
  testEmail: process.env.TEST_OFFICIAL_EMAIL || '',
  testPassword: process.env.TEST_OFFICIAL_PASSWORD || '',

  // Polling configuration
  maxWaitTimeMs: 5 * 60 * 1000, // 5 minutes max wait
  pollIntervalMs: 5000, // Poll every 5 seconds

  // Test queries
  testQueries: [
    // English queries
    'What is the total budget allocation for this document?',
    'What are the key priorities mentioned?',
    'How much is allocated to education?',
    // Swahili query
    'Bajeti ya elimu ni kiasi gani?',
  ],
};

// =============================================================================
// TYPES
// =============================================================================

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  duration?: number;
  data?: unknown;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

// =============================================================================
// UTILITIES
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  };
  console.log(`${icons[type]} ${message}`);
}

function logStep(step: number, total: number, message: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`STEP ${step}/${total}: ${message}`);
  console.log('='.repeat(70));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  maxWaitMs: number,
  pollIntervalMs: number,
  description: string
): Promise<T> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await fn();
    if (predicate(result)) {
      return result;
    }
    log(`Waiting for ${description}... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`, 'info');
    await sleep(pollIntervalMs);
  }

  throw new Error(`Timeout waiting for ${description} after ${maxWaitMs / 1000}s`);
}

// =============================================================================
// API HELPERS
// =============================================================================

async function authenticate(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('No session returned from authentication');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

async function uploadDocument(
  filePath: string,
  title: string,
  auth: AuthSession
): Promise<{ documentId: string; document: Record<string, unknown> }> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), fileName);
  formData.append('title', title);
  formData.append('category', 'budgeting');
  formData.append('documentType', 'ADP'); // Annual Development Plan

  const response = await fetch(`${CONFIG.baseUrl}/api/documents/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  return {
    documentId: data.document.id,
    document: data.document,
  };
}

async function getDocumentStatus(
  documentId: string,
  auth: AuthSession
): Promise<Record<string, unknown>> {
  const response = await fetch(`${CONFIG.baseUrl}/api/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get document status: ${response.statusText}`);
  }

  const data = await response.json();
  return data.document || data;
}

async function publishDocument(documentId: string, auth: AuthSession): Promise<void> {
  const response = await fetch(`${CONFIG.baseUrl}/api/documents/${documentId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Publish failed: ${error.error || response.statusText}`);
  }
}

async function getChatStatus(documentId: string): Promise<{
  chatEnabled: boolean;
  embeddingStatus: string;
  chunkCount?: number;
}> {
  const response = await fetch(
    `${CONFIG.baseUrl}/api/public/documents/${documentId}/chat/status`
  );

  if (!response.ok) {
    throw new Error(`Failed to get chat status: ${response.statusText}`);
  }

  return response.json();
}

async function sendChatMessage(
  documentId: string,
  message: string,
  sessionId: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{
  message: string;
  language: string;
  sources: Array<{
    chunkIndex: number;
    pageNumber: number | null;
    sectionName: string | null;
    preview: string;
    relevanceScore: number;
  }>;
  metadata: {
    tokensUsed: number;
    latencyMs: number;
  };
}> {
  const response = await fetch(
    `${CONFIG.baseUrl}/api/public/documents/${documentId}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId,
        conversationHistory,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Chat failed: ${error.error || response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// TEST STEPS
// =============================================================================

const results: TestResult[] = [];

async function runTest(): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           RAG CHAT END-TO-END TEST                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log();

  // Validate configuration
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    log('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required in .env.local', 'error');
    process.exit(1);
  }

  if (!CONFIG.testEmail || !CONFIG.testPassword) {
    log(
      'TEST_OFFICIAL_EMAIL and TEST_OFFICIAL_PASSWORD environment variables required',
      'error'
    );
    log('Set these in .env.local or export them before running the test', 'info');
    log('Example: TEST_OFFICIAL_EMAIL=official@example.com TEST_OFFICIAL_PASSWORD=password npx tsx scripts/test-rag-chat-e2e.ts', 'info');
    process.exit(1);
  }

  // Check test document exists
  if (!fs.existsSync(CONFIG.testDocumentPath)) {
    log(`Test document not found: ${CONFIG.testDocumentPath}`, 'error');
    process.exit(1);
  }

  log(`Test Document: ${path.basename(CONFIG.testDocumentPath)}`, 'info');
  log(`Base URL: ${CONFIG.baseUrl}`, 'info');
  log(`Supabase URL: ${CONFIG.supabaseUrl}`, 'info');
  console.log();

  let auth: AuthSession;
  let documentId: string;
  const sessionId = `test-session-${Date.now()}`;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Authentication
  // ─────────────────────────────────────────────────────────────────────────
  logStep(1, 7, 'AUTHENTICATION');

  try {
    const startTime = Date.now();
    auth = await authenticate(CONFIG.testEmail, CONFIG.testPassword);
    const duration = Date.now() - startTime;

    log(`Authenticated as ${CONFIG.testEmail}`, 'success');
    results.push({
      step: 'Authentication',
      success: true,
      message: 'Successfully authenticated',
      duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Authentication failed: ${message}`, 'error');
    results.push({
      step: 'Authentication',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Document Upload
  // ─────────────────────────────────────────────────────────────────────────
  logStep(2, 7, 'DOCUMENT UPLOAD');

  try {
    const startTime = Date.now();
    const testTitle = `E2E Test ADP ${new Date().toISOString()}`;

    const uploadResult = await uploadDocument(CONFIG.testDocumentPath, testTitle, auth);
    documentId = uploadResult.documentId;
    const duration = Date.now() - startTime;

    log(`Document uploaded: ${documentId}`, 'success');
    log(`Title: ${testTitle}`, 'info');
    results.push({
      step: 'Document Upload',
      success: true,
      message: `Uploaded document ${documentId}`,
      duration,
      data: { documentId, title: testTitle },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Upload failed: ${message}`, 'error');
    results.push({
      step: 'Document Upload',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Wait for Extraction
  // ─────────────────────────────────────────────────────────────────────────
  logStep(3, 7, 'TEXT EXTRACTION (Inngest Background Job)');

  try {
    const startTime = Date.now();

    const doc = await pollUntil(
      () => getDocumentStatus(documentId, auth),
      (doc) => {
        const status = doc.extraction_status as string;
        return status === 'completed' || status === 'completed_scanned' || status === 'failed';
      },
      CONFIG.maxWaitTimeMs,
      CONFIG.pollIntervalMs,
      'text extraction'
    );

    const duration = Date.now() - startTime;
    const status = doc.extraction_status as string;

    if (status === 'failed') {
      throw new Error(`Extraction failed: ${doc.extraction_error || 'Unknown error'}`);
    }

    log(`Extraction completed: ${status}`, 'success');
    log(`Page count: ${doc.extraction_page_count}`, 'info');
    results.push({
      step: 'Text Extraction',
      success: true,
      message: `Extracted ${doc.extraction_page_count} pages`,
      duration,
      data: { status, pageCount: doc.extraction_page_count },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Extraction failed: ${message}`, 'error');
    results.push({
      step: 'Text Extraction',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Wait for Summarization & Translation
  // ─────────────────────────────────────────────────────────────────────────
  logStep(4, 7, 'SUMMARIZATION & TRANSLATION (Inngest Background Jobs)');

  try {
    const startTime = Date.now();

    const doc = await pollUntil(
      () => getDocumentStatus(documentId, auth),
      (doc) => {
        const hasEnSummary = !!doc.summary_en;
        const hasSwSummary = !!doc.summary_sw;
        return hasEnSummary && hasSwSummary;
      },
      CONFIG.maxWaitTimeMs,
      CONFIG.pollIntervalMs,
      'summarization and translation'
    );

    const duration = Date.now() - startTime;

    log('English summary generated', 'success');
    log('Swahili translation generated', 'success');
    log(`Summary confidence: ${((doc.summary_confidence as number) * 100).toFixed(0)}%`, 'info');
    results.push({
      step: 'Summarization & Translation',
      success: true,
      message: 'Both EN and SW summaries ready',
      duration,
      data: { summaryConfidence: doc.summary_confidence },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Summarization/Translation failed: ${message}`, 'error');
    results.push({
      step: 'Summarization & Translation',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Publish Document
  // ─────────────────────────────────────────────────────────────────────────
  logStep(5, 7, 'PUBLISH DOCUMENT');

  try {
    const startTime = Date.now();

    await publishDocument(documentId, auth);
    const duration = Date.now() - startTime;

    log('Document published successfully', 'success');
    log('Embedding generation triggered', 'info');
    results.push({
      step: 'Publish Document',
      success: true,
      message: 'Document published and embedding generation started',
      duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Publish failed: ${message}`, 'error');
    results.push({
      step: 'Publish Document',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Wait for Embedding Generation
  // ─────────────────────────────────────────────────────────────────────────
  logStep(6, 7, 'EMBEDDING GENERATION (Inngest Background Job)');

  try {
    const startTime = Date.now();

    const chatStatus = await pollUntil(
      () => getChatStatus(documentId),
      (status) => {
        return (
          status.chatEnabled === true ||
          status.embeddingStatus === 'completed' ||
          status.embeddingStatus === 'failed'
        );
      },
      CONFIG.maxWaitTimeMs,
      CONFIG.pollIntervalMs,
      'embedding generation'
    );

    const duration = Date.now() - startTime;

    if (chatStatus.embeddingStatus === 'failed') {
      throw new Error('Embedding generation failed');
    }

    if (!chatStatus.chatEnabled) {
      throw new Error('Chat not enabled after embedding generation');
    }

    log(`Embeddings generated: ${chatStatus.chunkCount} chunks`, 'success');
    log('Chat is now enabled', 'success');
    results.push({
      step: 'Embedding Generation',
      success: true,
      message: `Generated ${chatStatus.chunkCount} embeddings`,
      duration,
      data: { chunkCount: chatStatus.chunkCount },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Embedding generation failed: ${message}`, 'error');
    results.push({
      step: 'Embedding Generation',
      success: false,
      message,
    });
    printSummary();
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 7: Test Chat Functionality
  // ─────────────────────────────────────────────────────────────────────────
  logStep(7, 7, 'CHAT FUNCTIONALITY');

  const conversationHistory: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < CONFIG.testQueries.length; i++) {
    const query = CONFIG.testQueries[i];
    console.log(`\n--- Query ${i + 1}/${CONFIG.testQueries.length} ---`);
    log(`User: "${query}"`, 'info');

    try {
      const startTime = Date.now();

      const response = await sendChatMessage(
        documentId,
        query,
        sessionId,
        conversationHistory
      );

      const duration = Date.now() - startTime;

      // Add to conversation history
      conversationHistory.push({ role: 'user', content: query });
      conversationHistory.push({ role: 'assistant', content: response.message });

      log(`Language detected: ${response.language}`, 'info');
      log(`Response (${response.metadata.latencyMs}ms, ${response.metadata.tokensUsed} tokens):`, 'success');
      console.log(`   "${response.message.substring(0, 200)}${response.message.length > 200 ? '...' : ''}"`);

      if (response.sources.length > 0) {
        log(`Sources: ${response.sources.length} chunks`, 'info');
        response.sources.slice(0, 2).forEach((source, idx) => {
          console.log(
            `   ${idx + 1}. Page ${source.pageNumber || 'N/A'}, Section: ${source.sectionName || 'N/A'} (score: ${source.relevanceScore.toFixed(2)})`
          );
        });
      }

      results.push({
        step: `Chat Query ${i + 1}`,
        success: true,
        message: `Query answered in ${duration}ms`,
        duration,
        data: {
          query,
          language: response.language,
          tokensUsed: response.metadata.tokensUsed,
          sourcesCount: response.sources.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Chat query failed: ${message}`, 'error');
      results.push({
        step: `Chat Query ${i + 1}`,
        success: false,
        message,
        data: { query },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  printSummary();

  // Cleanup hint
  console.log('\n📝 Cleanup:');
  console.log(`   Document ID: ${documentId}`);
  console.log('   To delete: Use the admin dashboard or run a cleanup script');
}

function printSummary(): void {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         TEST SUMMARY                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log();

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${(result.duration / 1000).toFixed(1)}s)` : '';
    console.log(`${icon} ${result.step}${duration}`);
    if (!result.success) {
      console.log(`   Error: ${result.message}`);
    }
  });

  console.log();
  console.log('-'.repeat(70));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log();

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! RAG Chat feature is working end-to-end.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// =============================================================================
// RUN
// =============================================================================

runTest().catch((error) => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
