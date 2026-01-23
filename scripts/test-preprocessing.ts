/**
 * Test Script: Document Preprocessing Pipeline
 *
 * Tests the new page-based preprocessing functionality with an example CBROP document.
 * Run with: npx tsx scripts/test-preprocessing.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractText, getDocumentProxy } from 'unpdf';
import {
  preprocessDocument,
  preprocessDocumentFromPages,
  parseTableOfContents,
  parseTableOfContentsFromPages,
  matchTocEntriesToHeaders,
  type DocumentType,
} from '../lib/utils/documentPreprocessor';

// Test document path
const TEST_DOCUMENT_PATH = path.join(
  process.cwd(),
  'dev-docs/example-docs/APPROVED CBROP 2023 -FINAL.pdf-0.03404600 1726853640.pdf'
);

/**
 * Extract text from PDF - merged into single string
 */
async function extractTextMerged(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  const pdf = await getDocumentProxy(uint8Array);
  const { text } = await extractText(pdf, { mergePages: true });
  return text as string;
}

/**
 * Extract text from PDF - page by page (NEW)
 */
async function extractTextPageByPage(filePath: string): Promise<{ pages: string[]; pageCount: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  const pdf = await getDocumentProxy(uint8Array);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  return { pages: text as string[], pageCount: totalPages };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('PREPROCESSING PIPELINE TEST (PAGE-BY-PAGE)');
  console.log('='.repeat(70));
  console.log();

  // Check if test document exists
  if (!fs.existsSync(TEST_DOCUMENT_PATH)) {
    console.error('❌ Test document not found:', TEST_DOCUMENT_PATH);
    process.exit(1);
  }

  console.log('📄 Test Document:', path.basename(TEST_DOCUMENT_PATH));
  console.log('📁 Document Type: CBROP (County Budget Review and Outlook Paper)');
  console.log();

  // Step 1: Extract text from PDF (page-by-page)
  console.log('-'.repeat(70));
  console.log('STEP 1: PDF TEXT EXTRACTION (PAGE-BY-PAGE)');
  console.log('-'.repeat(70));

  const extractStartTime = Date.now();
  const { pages, pageCount } = await extractTextPageByPage(TEST_DOCUMENT_PATH);
  const extractDuration = Date.now() - extractStartTime;
  const totalChars = pages.reduce((sum, p) => sum + p.length, 0);

  console.log(`✓ Extracted text in ${extractDuration}ms`);
  console.log(`  - Pages: ${pageCount}`);
  console.log(`  - Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  - Estimated tokens: ${estimateTokens(pages.join('')).toLocaleString()}`);
  console.log(`  - Size: ${formatBytes(totalChars)}`);
  console.log();

  // Show sample of first few pages
  console.log('  Sample page lengths:');
  pages.slice(0, 5).forEach((page, i) => {
    console.log(`    Page ${i + 1}: ${page.length} chars`);
  });
  console.log();

  // Step 2: Parse TOC from pages (NEW approach)
  console.log('-'.repeat(70));
  console.log('STEP 2: TABLE OF CONTENTS PARSING (PAGE-BASED)');
  console.log('-'.repeat(70));

  const tocEntries = parseTableOfContentsFromPages(pages, { start: 1, end: 8 });

  if (tocEntries.length > 0) {
    console.log(`✓ Found ${tocEntries.length} TOC entries:`);
    tocEntries.slice(0, 15).forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.title} (page ${entry.pageNum})`);
    });
    if (tocEntries.length > 15) {
      console.log(`  ... and ${tocEntries.length - 15} more entries`);
    }
  } else {
    console.log('⚠ No TOC entries found with page-based parsing');
    console.log('  Trying merged text parsing as fallback...');

    const mergedText = pages.join('\n\n');
    const fallbackEntries = parseTableOfContents(mergedText);
    if (fallbackEntries.length > 0) {
      console.log(`  Fallback found ${fallbackEntries.length} entries`);
    }
  }
  console.log();

  // Step 3: Full page-based preprocessing
  console.log('-'.repeat(70));
  console.log('STEP 3: FULL PAGE-BASED PREPROCESSING');
  console.log('-'.repeat(70));

  const preprocessStartTime = Date.now();
  const result = preprocessDocumentFromPages(pages, 'CBROP' as DocumentType);
  const preprocessDuration = Date.now() - preprocessStartTime;

  console.log(`✓ Preprocessing completed in ${preprocessDuration}ms`);
  console.log();
  console.log('  Results:');
  console.log(`  - TOC Parse Success: ${result.tocParseSuccess ? '✓' : '✗'}`);
  console.log(`  - Original length: ${result.originalLength.toLocaleString()} chars`);
  console.log(`  - Filtered length: ${result.filteredLength.toLocaleString()} chars`);
  console.log(`  - Reduction: ${result.reductionPercent.toFixed(1)}%`);
  console.log(`  - Original tokens (est): ${estimateTokens(pages.join('')).toLocaleString()}`);
  console.log(`  - Filtered tokens (est): ${estimateTokens(result.filteredText).toLocaleString()}`);
  console.log();

  if (result.sectionsKept.length > 0) {
    console.log(`  Sections KEPT (${result.sectionsKept.length}):`);
    result.sectionsKept.slice(0, 10).forEach(s => {
      console.log(`    ✓ ${s.substring(0, 60)}${s.length > 60 ? '...' : ''}`);
    });
    if (result.sectionsKept.length > 10) {
      console.log(`    ... and ${result.sectionsKept.length - 10} more`);
    }
  }
  console.log();

  if (result.sectionsRemoved.length > 0) {
    console.log(`  Sections REMOVED (${result.sectionsRemoved.length}):`);
    result.sectionsRemoved.forEach(s => {
      console.log(`    ✗ ${s.substring(0, 60)}${s.length > 60 ? '...' : ''}`);
    });
  }
  console.log();

  // Step 4: GPT-4o-mini context fit check
  console.log('-'.repeat(70));
  console.log('STEP 4: GPT-4o-mini CONTEXT FIT CHECK');
  console.log('-'.repeat(70));

  const CONTEXT_WINDOW = 128000;
  const MAX_OUTPUT_TOKENS = 16000;
  const SAFETY_BUFFER = 1000;
  const AVAILABLE_INPUT = CONTEXT_WINDOW - MAX_OUTPUT_TOKENS - SAFETY_BUFFER;

  const originalTokens = estimateTokens(pages.join(''));
  const filteredTokens = estimateTokens(result.filteredText);

  console.log(`  GPT-4o-mini Context: ${CONTEXT_WINDOW.toLocaleString()} tokens`);
  console.log(`  Max Output: ${MAX_OUTPUT_TOKENS.toLocaleString()} tokens`);
  console.log(`  Available for Input: ${AVAILABLE_INPUT.toLocaleString()} tokens`);
  console.log();
  console.log(`  Original document: ${originalTokens.toLocaleString()} tokens`);
  console.log(`    → ${originalTokens <= AVAILABLE_INPUT ? '✓ Fits in context' : '✗ Exceeds context (would need chunking)'}`);
  console.log();
  console.log(`  After preprocessing: ${filteredTokens.toLocaleString()} tokens`);
  console.log(`    → ${filteredTokens <= AVAILABLE_INPUT ? '✓ Fits in context' : '✗ Exceeds context (would need chunking)'}`);
  console.log();

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(`  Document: CBROP 2023 (${pageCount} pages)`);
  console.log(`  Extraction: Page-by-page (mergePages: false)`);
  console.log(`  TOC Parsing: ${result.tocParseSuccess ? '✓ Success' : '✗ Failed (used fallback)'}`);
  console.log(`  Text Reduction: ${result.reductionPercent.toFixed(1)}%`);
  console.log(`  Token Reduction: ${originalTokens.toLocaleString()} → ${filteredTokens.toLocaleString()} (${((1 - filteredTokens/originalTokens) * 100).toFixed(1)}% saved)`);
  console.log(`  Context Fit: ${filteredTokens <= AVAILABLE_INPUT ? '✓ Single-pass processing possible' : '⚠ Chunking still required'}`);
  console.log();

  // Show sample of filtered text
  console.log('-'.repeat(70));
  console.log('SAMPLE OF FILTERED TEXT (first 1500 chars)');
  console.log('-'.repeat(70));
  console.log(result.filteredText.substring(0, 1500));
  console.log('...');
  console.log();

  console.log('✓ Test completed successfully!');
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
