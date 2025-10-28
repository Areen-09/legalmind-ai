import json
import re
from langgraph.graph import StateGraph, END
from app.services import llm_service, storage_service, highlight_service
from typing import TypedDict, List
import os
import tempfile


# --- State Definition ---
class HighlightState(TypedDict):
    user_id: str
    doc_id: str
    highlights: List[str]
    highlighted_doc_url: str

# --- Agent Steps ---

def apply_highlights(state: HighlightState):
    """Applies the highlights to the document and uploads the new version."""
    print("--- HIGHLIGHT AGENT: Applying highlights to the document... ---")
    user_id = state["user_id"]
    doc_id = state["doc_id"]
    highlights = state["highlights"]

    # Download the original file
    original_path, filename = storage_service.download_document(user_id, doc_id)
    
    # Define the output path
    output_path = os.path.join(tempfile.gettempdir(), f"highlighted_{filename}")

    
    # Apply highlights
    highlighted_path = highlight_service.highlight_text(original_path, output_path, [str(v) for v in highlights.values()])
    
    # Upload the highlighted file
    highlighted_doc_url = storage_service.upload_highlighted_document(user_id, doc_id, highlighted_path)
    state["highlighted_doc_url"] = highlighted_doc_url
    
    # Clean up local files
    os.remove(highlighted_path)

    
    return state

# --- Graph Definition ---
graph = StateGraph(HighlightState)
graph.add_node("apply_highlights", apply_highlights)
graph.set_entry_point("apply_highlights")
graph.add_edge("apply_highlights", END)

highlighting_agent = graph.compile()
