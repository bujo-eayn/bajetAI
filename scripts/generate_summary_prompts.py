import os
import math
import sys

try:
    from pypdf import PdfReader
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

# ---------------------------------------------------------------------------
# Configuration (Mimics summarizationService.ts)
# ---------------------------------------------------------------------------

CHUNK_SIZE_TOKENS = 50000     # ~200,000 characters per chunk
CHUNK_OVERLAP_TOKENS = 500    # ~2000 characters overlap
MIN_CHUNK_TOKENS = 1000
MAX_CHUNK_TOKENS = 50000
CHARS_PER_TOKEN = 4           # Approximate ratio

DIRECT_PROCESSING_THRESHOLD = 110000  # tokens (~440,000 chars)

MAX_SUMMARY_LENGTH = 600
MIN_SUMMARY_LENGTH = 200

# Set this to the path of your text or PDF file you wish to summarize
# e.g., "my_long_draft.pdf" or "sample_document.txt"
INPUT_FILE = "1769084259743-APPROVED_CBROP_2023_-FINAL.pdf-0.03404600_1726853640_2.pdf"
INPUT_FILE_PATH = f"testfiles/{INPUT_FILE}"


# ---------------------------------------------------------------------------
# Prompts (Mimics summarization.ts)
# ---------------------------------------------------------------------------

SUMMARIZATION_SYSTEM_PROMPT = """SYSTEM INSTRUCTION: You are an expert document analyzer specializing in creating comprehensive, structured summaries. Always act in this role. Your task is to analyze documents and produce clear, well-organized summaries that help readers quickly understand the key content.

## Output Requirements

1. **Structure**: Use markdown format with H2 headers (##) for each major topic or section
2. **Coverage**: Identify and summarize ALL substantive sections of the document
3. **Clarity**: Use clear, accessible language appropriate for a general audience
4. **Accuracy**: Preserve key figures, dates, and factual information exactly
5. **Organization**: Present information in logical order following document flow

## Content Filtering

**SKIP these sections** (do not include in summary):
- Table of contents
- References and bibliography
- Index sections
- Acknowledgments
- Copyright and legal boilerplate
- Lists of figures or tables
- Glossaries (unless containing critical definitions)
- Appendices with raw data tables

**PRIORITIZE these sections** (focus your summary here):
- Executive summaries and abstracts
- Main body content and analysis
- Key findings and conclusions
- Data analysis and interpretations
- Recommendations and action items
- Strategic objectives and goals
- Financial information and allocations
- Timelines and milestones
- Policy proposals and changes

## Formatting Guidelines

- Use H2 headers (##) for main topics/chapters
- Use bullet points for sub-points within sections
- Preserve numerical data with appropriate context
- Maintain professional, objective tone
- Ensure smooth transitions between topics
- Include section markers for document parts (e.g., "Section 3: Budget Allocation")

Remember: The goal is comprehensive coverage of substantive content, not exhaustive detail. Focus on what matters most to understanding the document's purpose and key messages."""

def generate_single_chunk_prompt(text: str, min_words: int, max_words: int) -> str:
    return f"""Please create a comprehensive, structured summary of the following document. Your summary should:

- Be between {min_words} and {max_words} words
- Use markdown H2 headers (##) to organize main topics
- Cover all key sections and findings
- Skip table of contents, references, and boilerplate
- Preserve important figures and dates

Document to summarize:

{text}"""

def generate_chunk_prompt(text: str, chunk_index: int, total_chunks: int, min_words: int, max_words: int) -> str:
    position_context = ""
    if total_chunks > 1:
        position_context = f"\n\nNote: This is part {chunk_index + 1} of {total_chunks} from a larger document. Summarize this section comprehensively, as it will be combined with other sections later."

    return f"""Please create a structured summary of this document section. Your summary should:

- Be between {min_words} and {max_words} words
- Use markdown H2 headers (##) for main topics in this section
- Identify and summarize all key points
- Skip any table of contents, references, or boilerplate
- Preserve important figures and dates
- Focus on substantive content only{position_context}

Document section to summarize:

{text}"""

def generate_combination_prompt(min_words: int, max_words: int) -> str:
    return f"""I have individual summaries from different sections of a document. Please synthesize these into a single, coherent final summary that:

- Is between {min_words} and {max_words} words
- Uses markdown H2 headers (##) to organize main topics
- Combines information logically by topic (not by section)
- Eliminates redundancy and duplication
- Maintains all key information and figures
- Provides a complete overview of the entire document
- Follows a logical flow from beginning to end

Individual section summaries to synthesize:

[PASTE ALL YOUR SECTION SUMMARIES HERE]"""


# ---------------------------------------------------------------------------
# Chunking Utilities (Mimics summarizationService.ts)
# ---------------------------------------------------------------------------

def tokenize_text(text: str) -> int:
    return math.ceil(len(text) / CHARS_PER_TOKEN)

def find_sentence_boundary(text: str, target_pos: int, search_backward: bool = True) -> int:
    delimiters = ['. ', '.\n', '! ', '!\n', '? ', '?\n']
    
    if search_backward:
        start_search = max(0, target_pos - 200)
        for i in range(target_pos, start_search - 1, -1):
            for delimiter in delimiters:
                if text[i:i + len(delimiter)] == delimiter:
                    return i + len(delimiter)
                    
        # Fallback to whitespace
        for i in range(target_pos, start_search - 1, -1):
            if i < len(text) and text[i].isspace():
                return i + 1
    else:
        end_search = min(len(text), target_pos + 200)
        for i in range(target_pos, end_search):
            for delimiter in delimiters:
                if text[i:i + len(delimiter)] == delimiter:
                    return i + len(delimiter)
                    
        # Fallback to whitespace
        for i in range(target_pos, end_search):
            if i < len(text) and text[i].isspace():
                return i + 1
                
    return target_pos

def split_by_boundary(text: str) -> list[dict]:
    chunks = []
    chunk_size_chars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN
    overlap_chars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN
    
    position = 0
    index = 0
    
    while position < len(text):
        end_pos = min(position + chunk_size_chars, len(text))
        
        if end_pos < len(text):
            end_pos = find_sentence_boundary(text, end_pos, True)
            
        chunk_text = text[position:end_pos].strip()
        
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "index": index,
                "startPos": position,
                "endPos": end_pos,
                "tokenCount": tokenize_text(chunk_text)
            })
            index += 1
            
        next_position = end_pos - overlap_chars
        min_progress = math.floor(chunk_size_chars / 2)
        position = max(position + min_progress, next_position)
        
        if position >= len(text):
            break
            
    return chunks

# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------

def read_file_content(filepath: str) -> str:
    """Reads content from either a .txt or .pdf file."""
    _, ext = os.path.splitext(filepath)
    ext = ext.lower()
    
    if ext == '.pdf':
        if not HAS_PYPDF:
            print("Error: The 'pypdf' library is required to read PDF files.")
            print("Please install it by running: pip install pypdf")
            sys.exit(1)
            
        print(f"Extracting text from PDF: '{filepath}'...")
        try:
            reader = PdfReader(filepath)
            text_parts = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            return "\\n\\n".join(text_parts)
        except Exception as e:
            print(f"Error reading PDF: {e}")
            sys.exit(1)
            
    elif ext == '.txt' or ext == '.md':
        print(f"Reading text file: '{filepath}'...")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback for Windows
            with open(filepath, "r", encoding="windows-1252") as f:
                return f.read()
    else:
        print(f"Error: Unsupported file extension '{ext}'. Please provide a .txt or .pdf file.")
        sys.exit(1)

def main():
    print(f"Checking for '{INPUT_FILE_PATH}'...")
    if not os.path.exists(INPUT_FILE_PATH):
        print(f"Error: File '{INPUT_FILE_PATH}' not found. Please create it or change INPUT_FILE_PATH in the script.")
        
        # Determine what dummy to create based on extension to avoid tricking the user
        if INPUT_FILE_PATH.lower().endswith(".pdf"):
             print(f"--> Cannot automatically create a dummy PDF. Please provide a real PDF or change INPUT_FILE_PATH to a .txt file.")
             sys.exit(1)
        else:
            # Create a dummy txt file for testing purposes if it doesn't exist.
            with open(INPUT_FILE_PATH, "w", encoding="utf-8") as f:
                f.write("This is a sample document. " * 50)
            print(f"--> Created a dummy '{INPUT_FILE_PATH}' for you to test with.")
        
    text = read_file_content(INPUT_FILE_PATH)
        
    trimmed_text = text.strip()
    
    if len(trimmed_text) < 100:
        print("Text too short to meaningfully chunk/summarize.")
        sys.exit(1)
        
    tokens = tokenize_text(trimmed_text)
    print(f"Document contains ~{tokens} tokens ({len(trimmed_text)} chars).")
    
    output_filename = os.path.join("testfiles", f"{os.path.basename(INPUT_FILE)}_prompts.md")
    print(f"Generating prompts into {output_filename}...")
    
    with open(output_filename, "w", encoding="utf-8") as out:
        out.write(f"# Manual Summarization Prompts for `{os.path.basename(INPUT_FILE_PATH)}`\n\n")
        out.write("This document contains the exact prompts needed to summarize your document via an LLM. Follow the instructions below.\n\n")
        
        out.write("## STEP 1: INITIALIZE THE LLM (SYSTEM PROMPT)\n\n")
        out.write("**Instruction**: Paste the following text into the 'System Instructions' box, or send it as your very first message.\n\n")
        out.write("```text\n")
        out.write(SUMMARIZATION_SYSTEM_PROMPT.strip() + "\n")
        out.write("```\n\n---\n\n")
        
        if tokens <= DIRECT_PROCESSING_THRESHOLD:
            out.write("## STEP 2: RUN SINGLE CHUNK SUMMARIZATION\n\n")
            out.write("**Instruction**: Your document fits in one context window. Paste the following prompt into the chat, wait for the summary, and you are done!\n\n")
            out.write("```text\n")
            out.write(generate_single_chunk_prompt(trimmed_text, MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH).strip() + "\n")
            out.write("```\n")
        else:
            chunks = split_by_boundary(trimmed_text)
            out.write(f"Your document is large and has been split into **{len(chunks)} chunks**.\n\n")
            out.write("## STEP 2: PROCESS ALL CHUNKS\n\n")
            out.write("**Instruction**: For each chunk below, paste the prompt into the chat, **wait for the LLM to reply**, and save that summary. Then move to the next chunk.\n\n")
            
            for chunk in chunks:
                out.write(f"### Chunk {chunk['index'] + 1} of {len(chunks)}\n\n")
                out.write("```text\n")
                out.write(generate_chunk_prompt(
                    chunk["text"], 
                    chunk["index"], 
                    len(chunks), 
                    MIN_SUMMARY_LENGTH, 
                    MAX_SUMMARY_LENGTH
                ).strip() + "\n")
                out.write("```\n\n")
                
            out.write("---\n\n")
            out.write("## STEP 3: CONSOLIDATE SUMMARIES (SYNTHESIS PROMPT)\n\n")
            out.write("**Instruction**: Once you have collected all the generated section summaries from Step 2, use this final prompt. Replace `[PASTE ALL YOUR SECTION SUMMARIES HERE]` with your collected summaries.\n\n")
            out.write("```text\n")
            out.write(generate_combination_prompt(MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH).strip() + "\n")
            out.write("```\n")
            
    print(f"Success! Open '{output_filename}' to begin copying your prompts.")


if __name__ == "__main__":
    main()
