import os
import math
import sys

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

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

# ---------------------------------------------------------------------------
# Document Type Specific Topics
# ---------------------------------------------------------------------------

DOCUMENT_TOPICS = {
    "CFSP": """
- Recent Economic Developments and Outlook: Overview of Economic Performance of The County, Global and Regional Economic Developments, County Fiscal Risks.
- Economic Performance Per Departments: Assessing performance across all county sectors.
- Update on Fiscal Performance: Revenue Performance (including Own Source Revenue) and Expenditure Performance.
- County Development Priorities for the Current Fiscal Year and the Medium Term: Key Sectoral/Departmental Priorities.
""",
    "CBROP": """
- Introduction: Legal Framework.
- Review of Fiscal Performance for the Previous Fiscal Year: Transfers from National Government, Revenue Collection, and County Expenditure.
- Recent Economic Developments and Outlook: Recent economic shifts and analysis of expenditure by departments.
- Analysis of Expenditure per Department: Detailed departmental spending assessment.
- Proposed Departmental Ceilings: Future budgetary allocations.
""",
    "ADP": """
- Introduction: Overview of the County, Demographic Profile (Population Size, Composition, Distribution), Strategic Objectives, and Rationale/Process.
- Review of the Implementation of the Previous ADP: Achievements, Status of Development Projects/Capital Projects, Challenges, Lessons Learnt, and Recommendations for each department.
- County Strategic Priorities, Programmes and Projects: Detailed departmental strategic priorities.
- Resource Requirements: Requirements by Sector and Programme, and response to financial/economic constraints.
- Monitoring and Evaluation: Framework for tracking progress.
"""
}

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

def get_system_prompt(doc_type: str) -> str:
    topics = DOCUMENT_TOPICS.get(doc_type.upper(), "all substantive sections.")
    
    return f"""SYSTEM INSTRUCTION: You are an expert document analyzer specializing in creating comprehensive, structured summaries for {doc_type} documents. Always act in this role. Your task is to analyze documents and produce clear, well-organized summaries that help readers quickly understand the key content.
    
IMPORTANT: For this {doc_type} document, your summary must explicitly capture and highlight the following topics as defined in the document structure:
{topics}

## Output Requirements

1. **Structure**: Use markdown format with H2 headers (##) for each major topic or section
2. **Coverage**: Identify and summarize ALL substantive sections of the document, prioritizing the topics listed above
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

## Formatting Guidelines

- Use H2 headers (##) for main topics/chapters
- Use bullet points for sub-points within sections
- Preserve numerical data with appropriate context
- Maintain professional, objective tone
- Ensure smooth transitions between topics
- Include section markers for document parts (e.g., "Section 3: Budget Allocation")

Remember: The goal is comprehensive coverage of substantive content, especially the specified {doc_type} topics, not exhaustive detail. Focus on what matters most to understanding the document's purpose and key messages."""

def generate_single_chunk_prompt(text: str, min_words: int, max_words: int, doc_type: str) -> str:
    return f"""Please create a comprehensive, structured summary of the following {doc_type} document. Your summary should:

- Be between {min_words} and {max_words} words
- Use markdown H2 headers (##) to organize main topics
- Cover all key sections and findings, explicitly highlighting the relevant {doc_type} specific topics
- Skip table of contents, references, and boilerplate
- Preserve important figures and dates

Document to summarize:

{text}"""

def generate_chunk_prompt(text: str, chunk_index: int, total_chunks: int, min_words: int, max_words: int, doc_type: str) -> str:
    position_context = ""
    if total_chunks > 1:
        position_context = f"\n\nNote: This is part {chunk_index + 1} of {total_chunks} from a larger {doc_type} document. Summarize this section comprehensively, ensuring you capture any {doc_type} specific topics present in this part, as it will be combined with other sections later."

    return f"""Please create a structured summary of this {doc_type} document section. Your summary should:

- Be between {min_words} and {max_words} words
- Use markdown H2 headers (##) for main topics in this section
- Identify and summarize all key points, focusing on {doc_type} specific requirements
- Skip any table of contents, references, or boilerplate
- Preserve important figures and dates
- Focus on substantive content only{position_context}

Document section to summarize:

{text}"""

def generate_combination_prompt(min_words: int, max_words: int, doc_type: str) -> str:
    return f"""I have individual summaries from different sections of a {doc_type} document. Please synthesize these into a single, coherent final summary that:

- Is between {min_words} and {max_words} words
- Uses markdown H2 headers (##) to organize main topics
- Combines information logically by topic (not by section)
- Eliminates redundancy and duplication
- Specifically ensures all {doc_type} specific topics are highlighted and synthesized across sections
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
        if not HAS_PDFPLUMBER:
            print("Error: The 'pdfplumber' library is required to read PDF files.")
            print("Please install it by running: pip install pdfplumber")
            sys.exit(1)
            
        print(f"Extracting text from PDF: '{filepath}'...")
        try:
            with pdfplumber.open(filepath) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n\n".join(text_parts)
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
    print("--- Specialized Summary Prompt Generator ---")
    
    # Get document type
    while True:
        doc_type = input("Enter document type (ADP, CFSP, or CBROP): ").strip().upper()
        if doc_type in ["ADP", "CFSP", "CBROP"]:
            break
        print("Invalid type. Please enter ADP, CFSP, or CBROP.")

    # Get input file
    input_file = input("Enter the path/filename of the document to summarize: ").strip()
    if not input_file:
        print("Error: Document path is required.")
        sys.exit(1)

    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found.")
        sys.exit(1)
        
    text = read_file_content(input_file)
    trimmed_text = text.strip()
    
    if len(trimmed_text) < 100:
        print("Text too short to meaningfully chunk/summarize.")
        sys.exit(1)
        
    tokens = tokenize_text(trimmed_text)
    print(f"Document contains ~{tokens} tokens ({len(trimmed_text)} chars).")
    
    base_name = os.path.basename(input_file)
    output_filename = f"{base_name}_{doc_type}_prompts.md"
    print(f"Generating specialized {doc_type} prompts into {output_filename}...")
    
    with open(output_filename, "w", encoding="utf-8") as out:
        out.write(f"# {doc_type} Specialized Summarization Prompts for `{base_name}`\n\n")
        out.write(f"This document contains specialized prompts tailored for **{doc_type}** documents. Follow the instructions below.\n\n")
        
        out.write("## STEP 1: INITIALIZE THE LLM (SYSTEM PROMPT)\n\n")
        out.write("**Instruction**: Paste the following text into the 'System Instructions' box, or send it as your very first message.\n\n")
        out.write("```text\n")
        out.write(get_system_prompt(doc_type).strip() + "\n")
        out.write("```\n\n---\n\n")
        
        if tokens <= DIRECT_PROCESSING_THRESHOLD:
            out.write("## STEP 2: RUN SINGLE CHUNK SUMMARIZATION\n\n")
            out.write("**Instruction**: Your document fits in one context window. Paste the following prompt into the chat, wait for the summary, and you are done!\n\n")
            out.write("```text\n")
            out.write(generate_single_chunk_prompt(trimmed_text, MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH, doc_type).strip() + "\n")
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
                    MAX_SUMMARY_LENGTH,
                    doc_type
                ).strip() + "\n")
                out.write("```\n\n")
                
            out.write("---\n\n")
            out.write("## STEP 3: CONSOLIDATE SUMMARIES (SYNTHESIS PROMPT)\n\n")
            out.write("**Instruction**: Once you have collected all the generated section summaries from Step 2, use this final prompt. Replace `[PASTE ALL YOUR SECTION SUMMARIES HERE]` with your collected summaries.\n\n")
            out.write("```text\n")
            out.write(generate_combination_prompt(MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH, doc_type).strip() + "\n")
            out.write("```\n")
            
    print(f"\nSuccess! Open '{output_filename}' to begin copying your specialized prompts.")


if __name__ == "__main__":
    main()
