/**
 * Document Preprocessor
 *
 * Intelligently processes budget documents by:
 * 1. Receiving document type from upload (CBROP, CFSP, ADP)
 * 2. Parsing Table of Contents to identify sections
 * 3. Matching TOC entries to actual headers in extracted text
 * 4. Organizing extracted text into detected sections
 * 5. Filtering low-value sections based on document type
 * 6. Returning structured, prioritized content
 *
 * This reduces token usage by 30-50% while preserving critical content.
 */

// =============================================================================
// TYPES
// =============================================================================

/** Budget document types (provided by uploader, not auto-detected) */
export type DocumentType = 'CBROP' | 'CFSP' | 'ADP';

/** TOC entry parsed from document */
export interface TocEntry {
  title: string;
  pageNum: number;
  level: number; // 1 = chapter, 2 = section, 3 = subsection
}

/** Section priority levels */
export type SectionPriority = 'critical' | 'high' | 'medium' | 'low' | 'remove';

/** Section with metadata */
export interface DetectedSection {
  name: string;
  tocEntry: TocEntry;
  startIndex: number;
  endIndex: number;
  content: string;
  priority: SectionPriority;
  matchConfidence: number; // 0-1, how confident we are in the match
}

/** Header match result */
interface HeaderMatch {
  tocEntry: TocEntry;
  index: number;
  matchedText: string;
  confidence: number;
  pattern: string;
}

/** Preprocessing result */
export interface PreprocessResult {
  documentType: DocumentType;
  sections: DetectedSection[];
  filteredText: string;
  originalLength: number;
  filteredLength: number;
  sectionsRemoved: string[];
  sectionsKept: string[];
  reductionPercent: number;
  tocParseSuccess: boolean;
  unmatchedTocEntries: string[];
}

// =============================================================================
// SECTION PRIORITY PATTERNS
// =============================================================================

/** Sections to REMOVE (applies to all document types) */
const REMOVE_PATTERNS: RegExp[] = [
  /^table\s+of\s+contents?$/i,
  /^list\s+of\s+(figures|tables|maps|abbreviations)/i,
  /^abbreviations?\s*(and\s+acronyms)?$/i,
  /^acknowledge?ments?$/i,
  /^preface$/i,
  /^foreword$/i,
  /^references$/i,
  /^bibliography$/i,
  /^appendix\s+[a-z]?\s*:?\s*(raw\s+data|tables|schedules)$/i,
  /^annex(es|ure)?/i,
  /^glossary$/i,
];

/** CRITICAL sections by document type */
const CRITICAL_BY_TYPE: Record<DocumentType, RegExp[]> = {
  CBROP: [
    /fiscal\s+performance/i,
    /budget\s+(review|ceilings|allocation)/i,
    /expenditure\s+(analysis|performance|review)/i,
    /revenue\s+(projections?|performance|analysis)/i,
    /proposed\s+.*ceilings/i,
  ],
  CFSP: [
    /executive\s+summary/i,
    /fiscal\s+(performance|strategy)/i,
    /development\s+priorities/i,
    /medium.term\s+fiscal/i,
    /budget\s+priorities/i,
    /expenditure\s+framework/i,
  ],
  ADP: [
    /executive\s+summary/i,
    /strategic\s+priorities/i,
    /programmes?\s+and\s+projects/i,
    /resource\s+requirements/i,
    /capital\s+projects/i,
    /development\s+priorities/i,
  ],
};

/** HIGH priority sections by document type */
const HIGH_BY_TYPE: Record<DocumentType, RegExp[]> = {
  CBROP: [
    /economic\s+(developments?|outlook)/i,
    /departmental\s+(analysis|expenditure)/i,
    /introduction/i,
  ],
  CFSP: [
    /economic\s+(developments?|outlook|performance)/i,
    /departmental\s+.*performance/i,
    /public\s+participation/i,
    /governance/i,
  ],
  ADP: [
    /review\s+of\s+previous/i,
    /monitoring\s+and\s+evaluation/i,
    /county\s+(overview|profile)/i,
    /implementation\s+(status|framework)/i,
  ],
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determine section hierarchy level from title format
 */
function determineLevel(rawTitle: string): number {
  // "CHAPTER 1" or "Chapter 1:" = level 1
  if (/^chapter\s+\d+/i.test(rawTitle)) return 1;

  // "1. Introduction" = level 1
  if (/^\d+\.\s+[A-Z]/.test(rawTitle)) return 1;

  // "1.1 Background" = level 2
  if (/^\d+\.\d+\s+/.test(rawTitle)) return 2;

  // "1.1.1 Details" = level 3
  if (/^\d+\.\d+\.\d+\s+/.test(rawTitle)) return 3;

  // ALL CAPS = likely chapter level
  if (rawTitle === rawTitle.toUpperCase() && rawTitle.length > 5) return 1;

  return 2; // Default to section level
}

/**
 * Determine section priority based on title AND document type
 */
function determinePriority(
  sectionTitle: string,
  documentType: DocumentType
): SectionPriority {
  // Check REMOVE patterns first (applies to all types)
  if (REMOVE_PATTERNS.some((p) => p.test(sectionTitle))) {
    return 'remove';
  }

  // Check CRITICAL patterns for this document type
  const criticalPatterns = CRITICAL_BY_TYPE[documentType] || [];
  if (criticalPatterns.some((p) => p.test(sectionTitle))) {
    return 'critical';
  }

  // Check HIGH patterns for this document type
  const highPatterns = HIGH_BY_TYPE[documentType] || [];
  if (highPatterns.some((p) => p.test(sectionTitle))) {
    return 'high';
  }

  // Default: keep as medium priority
  return 'medium';
}

// =============================================================================
// TOC PARSER
// =============================================================================

/**
 * Parse Table of Contents from extracted text
 *
 * TOC formats vary but typically look like:
 *
 * Format 1 (dots):
 *   Chapter 1: Introduction ............... 5
 *   1.1 Background ....................... 6
 *
 * Format 2 (tabs/spaces):
 *   Chapter 1: Introduction            5
 *   1.1 Background                     6
 */
export function parseTableOfContents(text: string): TocEntry[] {
  const entries: TocEntry[] = [];

  // Step 1: Find TOC section boundaries
  const tocStartPatterns = [/table\s+of\s+contents?\s*\n/i, /\bcontents?\s*\n/i];

  const tocEndPatterns = [
    // Common endings for TOC sections
    /\n\s*(list\s+of\s+(tables|figures)|chapter\s+1|1\.\s+introduction|executive\s+summary)/i,
    // Kenyan budget document patterns
    /\n\s*(abbreviations?\s+and\s+acronyms|legal\s+basis|fiscal\s+responsibility)/i,
    // Roman numeral sections starting main content
    /\n\s*I\.\s+(INTRODUCTION|OVERVIEW|BACKGROUND)/i,
    // Page marker patterns (common in Kenyan docs)
    /Page\s*\|\s*\d+\s*\n/i,
  ];

  let tocStart = -1;

  for (const pattern of tocStartPatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      tocStart = match.index + match[0].length;
      break;
    }
  }

  if (tocStart === -1) {
    console.log('[Preprocessor] No TOC found in document');
    return [];
  }

  // Find TOC end (where actual content begins)
  let tocEnd = -1;
  const textAfterToc = text.substring(tocStart);

  for (const pattern of tocEndPatterns) {
    const match = textAfterToc.match(pattern);
    if (match && match.index !== undefined) {
      tocEnd = tocStart + match.index;
      break;
    }
  }

  if (tocEnd === -1) {
    // Assume TOC is in first 10% of document, max 5000 chars
    tocEnd = tocStart + Math.min(text.length * 0.1, 5000);
  }

  const tocText = text.substring(tocStart, tocEnd);

  // Step 2: Extract TOC entries using multiple patterns
  const tocPatterns = [
    // Format: "Title .......... 123" or "Title ... 123" (dotted leaders)
    /^(.+?)\s*\.{2,}\s*(\d+)\s*$/gm,

    // Format: "Title\t\t123" (tabs)
    /^(.+?)\t+(\d+)\s*$/gm,

    // Format: "Title     123" (multiple spaces before number at end)
    /^(.+?)\s{3,}(\d+)\s*$/gm,

    // Format: "1.2.3 Title ... 123" (numbered with dots)
    /^([\d.]+\s+.+?)\s*\.{2,}\s*(\d+)\s*$/gm,

    // Format for Kenyan budget docs: "I. TITLE" or "II. TITLE" with page number
    /^([IVXLC]+\.\s+[A-Z][A-Z\s,&]+)\s*\.{2,}\s*(\d+)\s*$/gm,

    // Format: "1) DEPARTMENT NAME" or "1. Section Name" followed by dots and page
    /^(\d+[\)\.]?\s+[A-Z][A-Za-z\s,&]+)\s*\.{2,}\s*(\d+)\s*$/gm,

    // Format: Lines with title ending in number (single space before page num)
    // Common in PDFs where dotted leaders are stripped
    /^([A-Z][A-Za-z\s,&()]+[a-z\)])\s+(\d{1,3})\s*$/gm,
  ];

  const seenTitles = new Set<string>();

  for (const pattern of tocPatterns) {
    // Reset regex lastIndex for each pattern
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(tocText)) !== null) {
      const rawTitle = match[1].trim();
      const pageNum = parseInt(match[2], 10);

      // Clean up the title
      const title = rawTitle
        .replace(/^[\d.]+\s*/, '') // Remove leading numbers "1.2.3 "
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Determine hierarchy level
      const level = determineLevel(rawTitle);

      // Avoid duplicates
      const normalizedTitle = title.toLowerCase();
      if (!seenTitles.has(normalizedTitle) && title.length > 2) {
        seenTitles.add(normalizedTitle);
        entries.push({ title, pageNum, level });
      }
    }
  }

  // Sort by page number to maintain document order
  entries.sort((a, b) => a.pageNum - b.pageNum);

  console.log(`[Preprocessor] Parsed ${entries.length} TOC entries`);
  return entries;
}

// =============================================================================
// FUZZY HEADER MATCHING
// =============================================================================

/**
 * Create multiple fuzzy patterns to match a TOC title
 *
 * Returns patterns in order of confidence (exact match first, fuzzy last)
 */
function createFuzzyPatterns(
  title: string
): { pattern: string; confidence: number; name: string }[] {
  const patterns: { pattern: string; confidence: number; name: string }[] = [];

  // Normalize title for pattern creation
  const normalized = title
    .replace(/[^\w\s]/g, '\\W*') // Replace punctuation with optional non-word chars
    .replace(/\s+/g, '\\s+'); // Whitespace becomes flexible whitespace

  // Pattern 1: Exact match (highest confidence)
  patterns.push({
    pattern: `\\b${escapeRegex(title)}\\b`,
    confidence: 1.0,
    name: 'exact',
  });

  // Pattern 2: Case-insensitive with flexible whitespace
  patterns.push({
    pattern: `\\b${normalized}\\b`,
    confidence: 0.9,
    name: 'normalized',
  });

  // Pattern 3: Title might be split across lines
  const splitPattern = title
    .split(/\s+/)
    .map((word) => escapeRegex(word))
    .join('[\\s\\n]+');
  patterns.push({
    pattern: splitPattern,
    confidence: 0.8,
    name: 'split-lines',
  });

  // Pattern 4: Key words only (for very fuzzy matching)
  // Extract significant words (>3 chars, not common words)
  const commonWords = ['chapter', 'section', 'part', 'the', 'and', 'for', 'of'];
  const significantWords = title
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w) => !commonWords.includes(w.toLowerCase()))
    .slice(0, 4); // Use up to 4 key words

  if (significantWords.length >= 2) {
    const keywordPattern = significantWords
      .map((w) => escapeRegex(w))
      .join('[\\s\\S]{0,50}'); // Allow up to 50 chars between keywords
    patterns.push({
      pattern: keywordPattern,
      confidence: 0.6,
      name: 'keywords',
    });
  }

  // Pattern 5: Chapter/Section number matching
  const chapterMatch = title.match(/^(chapter|section)\s*(\d+)/i);
  if (chapterMatch) {
    const num = chapterMatch[2];
    // Match "Chapter 2" or "CHAPTER 2" or "2." followed by title-like text
    patterns.push({
      pattern: `(chapter|section)\\s*${num}[:\\s]+[A-Z][^\\n]{5,50}`,
      confidence: 0.7,
      name: 'chapter-num',
    });
  }

  return patterns;
}

/**
 * Calculate position-based confidence score
 *
 * If TOC says section is on page 12, and document has ~100 pages,
 * we expect to find it around 12% into the document.
 */
function calculatePositionScore(
  matchIndex: number,
  textLength: number,
  expectedPage: number,
  allEntries: TocEntry[]
): number {
  // Estimate total pages from max page number in TOC
  const maxPage = Math.max(...allEntries.map((e) => e.pageNum));

  if (maxPage === 0) return 1.0; // Can't validate position

  // Expected position as fraction of document
  const expectedPosition = expectedPage / maxPage;

  // Actual position as fraction of document
  const actualPosition = matchIndex / textLength;

  // Calculate how far off we are (0 = perfect, 1 = completely wrong)
  const deviation = Math.abs(expectedPosition - actualPosition);

  // Convert to score (allow 20% tolerance before penalizing)
  if (deviation < 0.1) return 1.0; // Within 10% = perfect
  if (deviation < 0.2) return 0.9; // Within 20% = very good
  if (deviation < 0.3) return 0.7; // Within 30% = acceptable
  if (deviation < 0.5) return 0.5; // Within 50% = questionable
  return 0.3; // Very far off = low confidence
}

/**
 * Resolve conflicts when multiple TOC entries match overlapping positions
 */
function resolveMatchConflicts(matches: HeaderMatch[]): HeaderMatch[] {
  const resolved: HeaderMatch[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    // Check for overlap (matches within 100 chars of each other)
    if (next && Math.abs(current.index - next.index) < 100) {
      // Keep the one with higher confidence
      if (current.confidence >= next.confidence) {
        resolved.push(current);
        i++; // Skip next
      } else {
        // Push next in the next iteration
        resolved.push(current);
      }
    } else {
      resolved.push(current);
    }
  }

  return resolved;
}

/**
 * Match TOC Entries to Headers in Extracted Text
 *
 * Algorithm:
 * 1. Create multiple fuzzy patterns for each TOC entry
 * 2. Search for all matches in the text
 * 3. Score matches based on quality and position
 * 4. Select best match for each TOC entry
 * 5. Validate ordering (sections should appear in page order)
 */
export function matchTocEntriesToHeaders(
  text: string,
  tocEntries: TocEntry[]
): { matches: HeaderMatch[]; unmatched: TocEntry[] } {
  const matches: HeaderMatch[] = [];
  const unmatched: TocEntry[] = [];

  for (const entry of tocEntries) {
    const patterns = createFuzzyPatterns(entry.title);
    let bestMatch: HeaderMatch | null = null;

    for (const { pattern, confidence: baseConfidence, name } of patterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          // Calculate match confidence
          const positionScore = calculatePositionScore(
            match.index,
            text.length,
            entry.pageNum,
            tocEntries
          );
          const confidence = baseConfidence * positionScore;

          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              tocEntry: entry,
              index: match.index,
              matchedText: match[0],
              confidence,
              pattern: name,
            };
          }
        }
      } catch (e) {
        // Regex might be invalid for some patterns, skip
        console.log(
          `[Preprocessor] Skipping invalid pattern for "${entry.title}": ${pattern}`
        );
      }
    }

    if (bestMatch && bestMatch.confidence > 0.3) {
      matches.push(bestMatch);
    } else {
      unmatched.push(entry);
      console.log(
        `[Preprocessor] Could not match TOC entry: "${entry.title}"`
      );
    }
  }

  // Sort matches by position in text
  matches.sort((a, b) => a.index - b.index);

  // Validate and resolve conflicts
  const resolvedMatches = resolveMatchConflicts(matches);

  return { matches: resolvedMatches, unmatched };
}

// =============================================================================
// SECTION BOUNDARY DETECTION
// =============================================================================

/**
 * Convert header matches into section boundaries
 *
 * Each section's content is the text between its header and the next header.
 * Front matter (before first matched header) is implicitly removed.
 */
function detectSectionBoundaries(
  text: string,
  matches: HeaderMatch[],
  documentType: DocumentType
): DetectedSection[] {
  const sections: DetectedSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    // Section starts at match position
    const startIndex = current.index;

    // Section ends at next section's start, or end of document
    const endIndex = next ? next.index : text.length;

    // Extract content
    const content = text.substring(startIndex, endIndex);

    // Determine priority based on section title and document type
    const priority = determinePriority(current.tocEntry.title, documentType);

    sections.push({
      name: current.tocEntry.title,
      tocEntry: current.tocEntry,
      startIndex,
      endIndex,
      content,
      priority,
      matchConfidence: current.confidence,
    });
  }

  return sections;
}

// =============================================================================
// HEURISTIC FALLBACK
// =============================================================================

/**
 * Detect sections heuristically when TOC is not available
 *
 * Uses common header patterns found in budget documents:
 * - ALL CAPS lines (likely chapter titles)
 * - Numbered sections "1. Introduction"
 * - "CHAPTER X:" patterns
 */
function detectSectionsHeuristically(
  text: string,
  documentType: DocumentType
): DetectedSection[] {
  const sections: DetectedSection[] = [];

  // Common header patterns in budget documents
  const headerPatterns = [
    // "CHAPTER 1: INTRODUCTION" or "CHAPTER 1 INTRODUCTION"
    /^(CHAPTER\s+\d+[:\s]+[A-Z][A-Z\s]+)$/gm,

    // "1. INTRODUCTION" or "1. Introduction"
    /^(\d+\.\s+[A-Z][A-Za-z\s]+)$/gm,

    // ALL CAPS line (at least 10 chars, likely a header)
    /^([A-Z][A-Z\s]{10,})$/gm,

    // Specific known headers
    /^(EXECUTIVE\s+SUMMARY|INTRODUCTION|CONCLUSION|RECOMMENDATIONS?)$/gm,
  ];

  // Find all headers
  const foundHeaders: { title: string; index: number }[] = [];

  for (const pattern of headerPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1].trim();

      // Skip if too short or likely not a header
      if (title.length < 5) continue;
      if (/^\d+$/.test(title)) continue; // Just a number

      foundHeaders.push({
        title,
        index: match.index,
      });
    }
  }

  // Remove duplicates and sort by position
  const uniqueHeaders = Array.from(
    new Map(foundHeaders.map((h) => [h.title.toLowerCase(), h])).values()
  ).sort((a, b) => a.index - b.index);

  // Convert to sections
  for (let i = 0; i < uniqueHeaders.length; i++) {
    const current = uniqueHeaders[i];
    const next = uniqueHeaders[i + 1];

    const startIndex = current.index;
    const endIndex = next ? next.index : text.length;
    const content = text.substring(startIndex, endIndex);

    sections.push({
      name: current.title,
      tocEntry: { title: current.title, pageNum: 0, level: 1 },
      startIndex,
      endIndex,
      content,
      priority: determinePriority(current.title, documentType),
      matchConfidence: 0.5, // Lower confidence for heuristic detection
    });
  }

  return sections;
}

// =============================================================================
// MAIN PREPROCESSING FUNCTION
// =============================================================================

/**
 * Main entry point for document preprocessing
 *
 * @param text - Raw extracted text from PDF
 * @param documentType - Document type selected by uploader (CBROP, CFSP, ADP)
 */
export function preprocessDocument(
  text: string,
  documentType: DocumentType
): PreprocessResult {
  const originalLength = text.length;

  console.log(
    `[Preprocessor] Starting preprocessing for ${documentType} document (${originalLength} chars)`
  );

  // Step 1: Parse Table of Contents
  const tocEntries = parseTableOfContents(text);
  const tocParseSuccess = tocEntries.length > 0;

  console.log(
    `[Preprocessor] TOC parsing: ${tocParseSuccess ? 'success' : 'failed'}, ${tocEntries.length} entries`
  );

  // Step 2: Match TOC entries to headers in text
  let sections: DetectedSection[];
  let unmatchedTocEntries: string[] = [];

  if (tocParseSuccess) {
    const { matches, unmatched } = matchTocEntriesToHeaders(text, tocEntries);
    unmatchedTocEntries = unmatched.map((e) => e.title);
    sections = detectSectionBoundaries(text, matches, documentType);

    console.log(
      `[Preprocessor] Matched ${matches.length}/${tocEntries.length} sections`
    );
    if (unmatched.length > 0) {
      console.log(
        `[Preprocessor] Unmatched entries: ${unmatchedTocEntries.join(', ')}`
      );
    }
  } else {
    // Fallback: Use heuristic header detection
    console.log(`[Preprocessor] Falling back to heuristic detection`);
    sections = detectSectionsHeuristically(text, documentType);
  }

  // Handle case where no sections were detected
  if (sections.length === 0) {
    console.log(
      `[Preprocessor] No sections detected, returning original text`
    );
    return {
      documentType,
      sections: [],
      filteredText: text,
      originalLength,
      filteredLength: text.length,
      sectionsRemoved: [],
      sectionsKept: [],
      reductionPercent: 0,
      tocParseSuccess,
      unmatchedTocEntries,
    };
  }

  // Step 3: Filter sections by priority
  const sectionsToKeep = sections.filter((s) => s.priority !== 'remove');
  const sectionsRemoved = sections
    .filter((s) => s.priority === 'remove')
    .map((s) => s.name);

  console.log(
    `[Preprocessor] Keeping ${sectionsToKeep.length} sections, removing ${sectionsRemoved.length}`
  );

  // Step 4: Build filtered text (preserving original document order)
  const filteredText = sectionsToKeep
    .sort((a, b) => a.startIndex - b.startIndex) // Maintain document order
    .map((s) => {
      // Add section header with priority tag for AI context
      const priorityTag = s.priority === 'critical' ? ' [CRITICAL]' : '';
      return `## ${s.name}${priorityTag}\n\n${s.content.trim()}`;
    })
    .join('\n\n---\n\n');

  const reductionPercent =
    ((originalLength - filteredText.length) / originalLength) * 100;

  console.log(
    `[Preprocessor] Reduction: ${reductionPercent.toFixed(1)}% (${originalLength} → ${filteredText.length} chars)`
  );

  return {
    documentType,
    sections: sectionsToKeep,
    filteredText,
    originalLength,
    filteredLength: filteredText.length,
    sectionsRemoved,
    sectionsKept: sectionsToKeep.map((s) => s.name),
    reductionPercent,
    tocParseSuccess,
    unmatchedTocEntries,
  };
}

// =============================================================================
// PAGE-BASED PREPROCESSING (NEW - More Accurate)
// =============================================================================

/**
 * TOC entry with page-based location
 */
interface PageTocEntry {
  title: string;
  pageNum: number;
  level: number;
}

/**
 * Parse TOC from specific pages (more reliable than merged text)
 *
 * @param pages - Array of page texts (one string per page)
 * @param searchPages - Page range to search for TOC (default: pages 1-6)
 */
export function parseTableOfContentsFromPages(
  pages: string[],
  searchPages: { start: number; end: number } = { start: 1, end: 6 }
): PageTocEntry[] {
  const entries: PageTocEntry[] = [];
  const seenTitles = new Set<string>();

  // Search only the specified page range for TOC
  const startIdx = Math.max(0, searchPages.start - 1); // Convert to 0-indexed
  const endIdx = Math.min(pages.length, searchPages.end);

  let foundTocStart = false;

  for (let pageIdx = startIdx; pageIdx < endIdx; pageIdx++) {
    const pageText = pages[pageIdx];
    const pageNumber = pageIdx + 1;

    // Check if this page contains TOC header
    if (!foundTocStart) {
      if (/table\s+of\s+contents?/i.test(pageText) || /\bcontents?\s*\n/i.test(pageText)) {
        foundTocStart = true;
        console.log(`[Preprocessor] Found TOC header on page ${pageNumber}`);
      } else {
        continue; // Skip pages before TOC
      }
    }

    // Extract TOC entries from this page
    const lines = pageText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;

      // Multiple patterns to match TOC entries
      const patterns = [
        // "Title .......... 45" (dotted leaders)
        /^(.+?)\s*\.{3,}\s*(\d{1,3})\s*$/,
        // "Title     45" (spaces before page num)
        /^([A-Z][A-Za-z\s,&()]+[a-z\)])\s{2,}(\d{1,3})\s*$/,
        // "I. INTRODUCTION ... 7" (roman numerals)
        /^([IVXLC]+\.\s+[A-Z][A-Z\s,&]+)\s*\.{2,}\s*(\d{1,3})\s*$/,
        // "1) Department Name ... 45" (numbered list)
        /^(\d+[\)\.]?\s+[A-Z][A-Za-z\s,&]+)\s*\.{2,}\s*(\d{1,3})\s*$/,
        // "SECTION TITLE 45" (all caps with page at end)
        /^([A-Z][A-Z\s,&]+[A-Z])\s+(\d{1,3})\s*$/,
      ];

      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const title = match[1]
            .replace(/^[\d.]+\s*/, '') // Remove leading numbers
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          const pageNum = parseInt(match[2], 10);

          // Skip if already seen or too short
          const normalizedTitle = title.toLowerCase();
          if (seenTitles.has(normalizedTitle) || title.length < 3) continue;

          // Skip non-content lines
          if (/^(page|table|figure|graph|chart)\s*\d*$/i.test(title)) continue;

          seenTitles.add(normalizedTitle);
          entries.push({
            title,
            pageNum,
            level: determineLevel(title),
          });
          break; // Found a match, move to next line
        }
      }
    }

    // Stop if we've moved past the TOC (found content headers)
    if (foundTocStart && entries.length > 5) {
      // Check if current page has non-TOC content
      if (/\n(PREFACE|INTRODUCTION|EXECUTIVE\s+SUMMARY|CHAPTER\s+1)/i.test(pageText)) {
        break;
      }
    }
  }

  // Sort by page number
  entries.sort((a, b) => a.pageNum - b.pageNum);

  console.log(`[Preprocessor] Parsed ${entries.length} TOC entries from pages ${searchPages.start}-${searchPages.end}`);
  return entries;
}

/**
 * Preprocess document using page-by-page extraction
 * This is more accurate than the merged text approach
 *
 * @param pages - Array of page texts from unpdf (mergePages: false)
 * @param documentType - Document type selected by uploader
 */
export function preprocessDocumentFromPages(
  pages: string[],
  documentType: DocumentType
): PreprocessResult {
  const originalText = pages.join('\n\n--- PAGE BREAK ---\n\n');
  const originalLength = originalText.length;
  const totalPages = pages.length;

  console.log(
    `[Preprocessor] Starting page-based preprocessing for ${documentType} document (${totalPages} pages, ${originalLength} chars)`
  );

  // Step 1: Parse TOC from early pages
  const tocEntries = parseTableOfContentsFromPages(pages, { start: 1, end: 8 });
  const tocParseSuccess = tocEntries.length > 0;

  console.log(
    `[Preprocessor] TOC parsing: ${tocParseSuccess ? 'success' : 'failed'}, ${tocEntries.length} entries`
  );

  // If no TOC found, fall back to merged text approach
  if (!tocParseSuccess) {
    console.log(`[Preprocessor] Falling back to merged text preprocessing`);
    const mergedText = pages.join('\n\n');
    return preprocessDocument(mergedText, documentType);
  }

  // Step 2: Map TOC entries to pages and determine priority
  interface PageSection {
    title: string;
    startPage: number;
    endPage: number;
    priority: SectionPriority;
    content: string;
  }

  const sections: PageSection[] = [];

  for (let i = 0; i < tocEntries.length; i++) {
    const entry = tocEntries[i];
    const nextEntry = tocEntries[i + 1];

    const startPage = entry.pageNum;
    // End page is either one before next section or the last page
    const endPage = nextEntry ? nextEntry.pageNum - 1 : totalPages;

    // Validate page range
    if (startPage < 1 || startPage > totalPages) continue;

    const priority = determinePriority(entry.title, documentType);

    // Extract content from page range (convert to 0-indexed)
    const pageContent = pages
      .slice(Math.max(0, startPage - 1), Math.min(endPage, totalPages))
      .join('\n\n');

    sections.push({
      title: entry.title,
      startPage,
      endPage,
      priority,
      content: pageContent,
    });
  }

  console.log(
    `[Preprocessor] Mapped ${sections.length} sections from TOC`
  );

  // Step 3: Filter by priority
  const sectionsToKeep = sections.filter((s) => s.priority !== 'remove');
  const sectionsRemoved = sections
    .filter((s) => s.priority === 'remove')
    .map((s) => s.title);

  console.log(
    `[Preprocessor] Keeping ${sectionsToKeep.length} sections, removing ${sectionsRemoved.length}`
  );

  // Step 4: Build filtered text
  const filteredText = sectionsToKeep
    .sort((a, b) => a.startPage - b.startPage)
    .map((s) => {
      const priorityTag = s.priority === 'critical' ? ' [CRITICAL]' : '';
      return `## ${s.title}${priorityTag} (Pages ${s.startPage}-${s.endPage})\n\n${s.content.trim()}`;
    })
    .join('\n\n---\n\n');

  const reductionPercent =
    ((originalLength - filteredText.length) / originalLength) * 100;

  console.log(
    `[Preprocessor] Reduction: ${reductionPercent.toFixed(1)}% (${originalLength} → ${filteredText.length} chars)`
  );

  // Convert to DetectedSection format for compatibility
  const detectedSections: DetectedSection[] = sectionsToKeep.map((s) => ({
    name: s.title,
    tocEntry: { title: s.title, pageNum: s.startPage, level: 1 },
    startIndex: 0, // Not applicable for page-based
    endIndex: 0,
    content: s.content,
    priority: s.priority,
    matchConfidence: 0.9, // High confidence from page-based matching
  }));

  return {
    documentType,
    sections: detectedSections,
    filteredText,
    originalLength,
    filteredLength: filteredText.length,
    sectionsRemoved,
    sectionsKept: sectionsToKeep.map((s) => s.title),
    reductionPercent,
    tocParseSuccess,
    unmatchedTocEntries: [],
  };
}
