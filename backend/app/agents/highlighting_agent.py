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
    text: str
    criteria: str
    highlighted_sections: List[str]
    highlighted_doc_url: str

# --- Agent Steps ---

def get_document_text(state: HighlightState):
    """Retrieves the full text of the document from cloud storage."""
    print("--- HIGHLIGHT AGENT: Retrieving document text... ---")
    text = storage_service.get_document_text(state["user_id"], state["doc_id"])
    state["text"] = text
    return state

def find_highlights(state: HighlightState):
    """Uses the LLM to find sections of the text that match the given criteria."""
    print(f"--- HIGHLIGHT AGENT: Finding highlights for criteria: '{state['criteria']}' ---")
    raw_result = llm_service.find_sections_for_highlighting(state["text"], state["criteria"])
    
    try:
        clean_json_str = re.sub(r'```json\s*|\s*```', '', raw_result, flags=re.DOTALL)
        result = json.loads(clean_json_str)
        state["highlighted_sections"] = result.get("sections", [])
        print("--- HIGHLIGHT AGENT: Successfully parsed highlighted sections. ---")
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"--- ❌ HIGHLIGHT AGENT ERROR: Failed to parse LLM output. Error: {e} ---")
        state["highlighted_sections"] = []
        
    return state

def apply_highlights(state: HighlightState):
    """Applies the highlights to the document and uploads the new version."""
    print("--- HIGHLIGHT AGENT: Applying highlights to the document... ---")
    user_id = state["user_id"]
    doc_id = state["doc_id"]
    highlights = state["highlighted_sections"]

    # Download the original file
    original_path, filename = storage_service.download_document(user_id, doc_id)
    
    # Define the output path
    output_path = os.path.join(tempfile.gettempdir(), f"highlighted_{filename}")

    
    # Apply highlights
    highlighted_path = highlight_service.highlight_text(original_path, output_path, highlights)
    
    # Upload the highlighted file
    highlighted_doc_url = storage_service.upload_highlighted_document(user_id, doc_id, highlighted_path)
    state["highlighted_doc_url"] = highlighted_doc_url
    
    # Clean up local files
    os.remove(highlighted_path)

    
    return state

# --- Graph Definition ---
graph = StateGraph(HighlightState)
graph.add_node("retrieve_text", get_document_text)
graph.add_node("find_highlights", find_highlights)
graph.add_node("apply_highlights", apply_highlights)

graph.set_entry_point("retrieve_text")
graph.add_edge("retrieve_text", "find_highlights")
graph.add_edge("find_highlights", "apply_highlights")
graph.add_edge("apply_highlights", END)

highlighting_agent = graph.compile()
