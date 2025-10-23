import fitz  # PyMuPDF for PDF
from docx import Document  # python-docx
from docx.shared import RGBColor
import os

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
            for text in highlights:
                areas = page.search_for(text)
                for area in areas:
                    highlight = page.add_highlight_annot(area)
                    highlight.update()
        doc.save(input_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
        return input_path


    # ---- DOCX ----
    elif ext == ".docx":
        doc = Document(input_path)
        for para in doc.paragraphs:
            for text in highlights:
                if text in para.text:
                    # Split run-wise to preserve formatting
                    for run in para.runs:
                        if text in run.text:
                            run.font.highlight_color = 7  # Yellow highlight
                            run.font.color.rgb = RGBColor(0, 0, 0)  # Black text
        doc.save(output_path)
        return output_path

    # ---- TXT ----
    elif ext == ".txt":
        with open(input_path, "r", encoding="utf-8") as f:
            content = f.read()
        for text in highlights:
            content = content.replace(
                text, f"<mark>{text}</mark>"
            )  # wrap with HTML <mark>
        return content  # Return as HTML for frontend rendering

    else:
        raise ValueError("Unsupported file format. Only PDF, DOCX, and TXT are supported.")
