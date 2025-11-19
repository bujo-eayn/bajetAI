// PDF Text Extraction Service
// This service handles all PDF text extraction logic using pdfjs-dist

import * as pdfjsLib from 'pdfjs-dist';
import { createAdminClient } from '@/lib/supabase/server';
import type { ExtractionResult, ExtractionErrorType } from '@/types';
import path from 'path';
import { pathToFileURL } from 'url';

// Configure pdfjs worker for server-side (Node.js)
// We disable canvas since we only need text extraction, not rendering
if (typeof window === 'undefined') {
  // Server-side configuration
  // Use the bundled worker from node_modules
  // Construct the absolute path to the worker file
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'build',
    'pdf.worker.min.mjs'
  );
  // Convert Windows path to file:// URL for ESM loader compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  // Disable canvas for Node.js environment (text extraction only)
  // This allows pdfjs-dist to work without the canvas native module
  (pdfjsLib as any).GlobalWorkerOptions.isEvalSupported = false;
}

/**
 * Download PDF from Supabase Storage
 * Retries download 2 times if first attempt fails
 */
async function downloadPDFFromStorage(fileName: string): Promise<Buffer> {
  const supabase = createAdminClient();
  let lastError: Error | null = null;

  // Construct full storage path (files are stored in documents/ subfolder)
  const filePath = `documents/${fileName}`;

  // Retry download up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;
      if (!data) throw new Error('No data returned from storage');

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error as Error;
      console.error(`Download attempt ${attempt + 1} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(
    `Failed to download PDF after 2 attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Extract text from PDF using pdfjs-dist
 * Processes each page sequentially and combines all text
 */
async function extractWithPDFJS(
  pdfBuffer: Buffer
): Promise<{ text: string; pageCount: number }> {
  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      // Don't specify standardFontDataUrl in Node.js - let pdfjs use bundled fonts
    });

    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items from page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    // Combine all pages
    const combinedText = textParts.join('\n\n');

    return {
      text: combinedText,
      pageCount,
    };
  } catch (error) {
    console.error('pdfjs extraction error:', error);
    throw error;
  }
}

/**
 * Save extracted text to Supabase Storage as .txt file
 * Returns the storage path for database reference
 */
async function saveExtractedText(
  documentId: string,
  text: string
): Promise<string> {
  const supabase = createAdminClient();
  const filePath = `${documentId}.txt`;
  const textBuffer = Buffer.from(text, 'utf-8');

  const { error } = await supabase.storage
    .from('extracted-text')
    .upload(filePath, textBuffer, {
      contentType: 'text/plain',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('Failed to save extracted text:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return filePath;
}

/**
 * Classify error into specific error types for better user feedback
 * Returns error type and user-friendly message
 */
function classifyError(error: Error): {
  errorType: ExtractionErrorType;
  message: string;
} {
  const errorMessage = error.message.toLowerCase();

  // Check for password-protected PDF
  if (
    errorMessage.includes('password') ||
    errorMessage.includes('encrypted') ||
    errorMessage.includes('decrypt')
  ) {
    return {
      errorType: 'encrypted',
      message: 'This PDF is password-protected. Please remove password protection and try again.',
    };
  }

  // Check for corrupt file
  if (
    errorMessage.includes('corrupt') ||
    errorMessage.includes('invalid pdf') ||
    errorMessage.includes('not a pdf') ||
    errorMessage.includes('parse error')
  ) {
    return {
      errorType: 'corrupt_file',
      message: 'PDF file is damaged or corrupted. Please try re-uploading the document.',
    };
  }

  // Check for timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      errorType: 'timeout',
      message: 'Extraction timed out. File may be too complex. Try compressing the PDF.',
    };
  }

  // Check for memory error
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return {
      errorType: 'memory_error',
      message: 'File is too large for processing. Please compress or split the PDF.',
    };
  }

  // Check for download failure
  if (
    errorMessage.includes('download') ||
    errorMessage.includes('storage') ||
    errorMessage.includes('fetch')
  ) {
    return {
      errorType: 'download_failed',
      message: 'Failed to download file from storage. Please try again.',
    };
  }

  // Generic parsing error
  if (errorMessage.includes('pdf') || errorMessage.includes('parse')) {
    return {
      errorType: 'parsing_error',
      message: 'Unable to parse PDF. Format may be unsupported.',
    };
  }

  // Unknown error
  return {
    errorType: 'unknown',
    message: 'An unexpected error occurred during extraction. Please try again.',
  };
}

/**
 * Main extraction function
 * Orchestrates the entire extraction process from download to storage
 */
export async function extractTextFromPDF(
  documentId: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  try {
    // 1. Get document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_name, file_size')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return {
        success: false,
        error: 'Document not found',
        errorType: 'unknown',
      };
    }

    // 2. Update status to 'extracting'
    await supabase
      .from('documents')
      .update({
        extraction_status: 'extracting',
        extraction_started_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    // 3. Download PDF from storage
    console.log(`Downloading PDF: ${document.file_name}`);
    const pdfBuffer = await downloadPDFFromStorage(document.file_name);

    // 4. Extract text using pdfjs
    console.log(`Extracting text from PDF...`);
    const { text, pageCount } = await extractWithPDFJS(pdfBuffer);

    // 5. Check if text is empty
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'No text found in PDF. Document may be blank or scanned.',
        errorType: 'empty',
        durationMs: Date.now() - startTime,
      };
    }

    // 6. Save extracted text to storage
    console.log(`Saving extracted text (${text.length} characters)...`);
    const textUrl = await saveExtractedText(documentId, text);

    // 7. Update database with success
    const durationMs = Date.now() - startTime;
    await supabase
      .from('documents')
      .update({
        extraction_status: 'completed',
        extracted_text_url: textUrl,
        extraction_page_count: pageCount,
        extraction_char_count: text.length,
        extraction_completed_at: new Date().toISOString(),
        extraction_duration_ms: durationMs,
        extraction_error: null,
        extraction_error_type: null,
        processed: true,
      })
      .eq('id', documentId);

    console.log(
      `Extraction completed: ${pageCount} pages, ${text.length} chars, ${durationMs}ms`
    );

    return {
      success: true,
      textUrl,
      pageCount,
      charCount: text.length,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const { errorType, message } = classifyError(error as Error);

    console.error('Extraction failed:', {
      documentId,
      error: (error as Error).message,
      errorType,
      durationMs,
    });

    // Update database with error
    await supabase
      .from('documents')
      .update({
        extraction_status: 'failed',
        extraction_error: message,
        extraction_error_type: errorType,
        extraction_completed_at: new Date().toISOString(),
        extraction_duration_ms: durationMs,
      })
      .eq('id', documentId);

    return {
      success: false,
      error: message,
      errorType,
      durationMs,
    };
  }
}
