import fitz  # PyMuPDF for PDF
from docx import Document  # python-docx
from docx.shared import RGBColor
import os
import re

def highlight_text(input_path: str, output_path: str, highlights: list[str]) -> str:
    """
    Highlight given texts in PDF, DOCX, or TXT files.

    Args:
        input_path: Path to the uploaded file.
        output_path: Path to save highlighted file (for PDF/DOCX).
        highlights: List of phrases to highlight.

    Returns:
        str: Path to highlighted file (PDF/DOCX) OR HTML string (for TXT).
    """
    ext = os.path.splitext(input_path)[-1].lower()

    # ---- PDF ----
    if ext == ".pdf":
        doc = fitz.open(input_path)
        for page in doc:
            for text_block in highlights:
                # Normalize the text block to handle newlines and extra spaces
                clean_text_block = re.sub(r'\s+', ' ', text_block).strip()
                # Split into sentences for more robust searching
                sentences = re.split(r'(?<=[.?!])\s+', clean_text_block)
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if len(sentence) > 2:  # Avoid searching for tiny fragments
                        areas = page.search_for(sentence, flags=fitz.TEXT_SEARCH_CASE_INSENSITIVE)
                        for area in areas:
                            highlight = page.add_highlight_annot(area)
                            highlight.update()
                            
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        return output_path

    # ---- DOCX ----
    elif ext == ".docx":
        doc = Document(input_path)
        for para in doc.paragraphs:
            for text_block in highlights:
                clean_text_block = re.sub(r'\s+', ' ', text_block).strip()
                sentences = re.split(r'(?<=[.?!])\s+', clean_text_block)
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    # Check if the cleaned sentence exists in the paragraph (case-insensitive)
                    if len(sentence) > 2 and sentence.lower() in para.text.lower():
                        # This is a simplified approach: highlight the entire paragraph
                        # if a sentence matches. A perfect solution requires complex
                        # run-level manipulation.
                        for run in para.runs:
                            run.font.highlight_color = 7  # WD_COLOR_INDEX.YELLOW
        doc.save(output_path)
        return output_path

    # ---- TXT ----
    elif ext == ".txt":
        with open(input_path, "r", encoding="utf-8") as f:
            content = f.read()
        for text in highlights:
            # Use regex for case-insensitive replacement
            content = re.sub(f"({re.escape(text)})", r"<mark>\1</mark>", content, flags=re.IGNORECASE)
        
        # Write to output file and return path, for consistency
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        return output_path

    else:
        raise ValueError("Unsupported file format. Only PDF, DOCX, and TXT are supported.")
