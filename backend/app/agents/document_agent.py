import json
import re
from langgraph.graph import StateGraph, END
from app.services import storage_service, pinecone_service, llm_service
from typing import TypedDict, List

# --- State Definition ---
class DocumentState(TypedDict):
    user_id: str
    file: object
    doc_id: str
    text: str
    classification: str
    # Fields from the new, detailed analysis
    summary: str
    key_clause_discussion: str
    risks: List[str]
    questions: List[dict]
    highlights: dict

# --- Agent Steps ---

def save_file(state: DocumentState):
    """Saves the uploaded file to cloud storage."""
    print("--- AGENT STEP: Saving file... ---")
    doc_id = storage_service.save_document(state["user_id"], state["file"])
    state["doc_id"] = doc_id
    return state

def extract_text_and_classify(state: DocumentState):
    """Extracts text from the document and classifies its type."""
    print("--- AGENT STEP: Extracting text and classifying... ---")
    
    # --- FIX: Read the raw bytes from the re-readable file object ---
    # The 'fitz' library needs the raw content, not our custom wrapper object.
    file_content_bytes = state["file"].file.read()
    
    text = storage_service.extract_text(file_content_bytes)
    state["text"] = text
    state["classification"] = llm_service.classify_document(text)
    return state

def get_full_analysis(state: DocumentState):
    """Gets the full analysis from the LLM service and updates the state."""
    print("--- AGENT STEP: Getting full analysis... ---")
    analysis = llm_service.get_full_analysis(state["text"], state["classification"])
    
    # --- FIX: Update the state with the results from the analysis ---
    state.update(analysis)
    return state


def embed_and_store(state: DocumentState):
    """Creates embeddings for the document text and stores it in Pinecone."""
    print("--- AGENT STEP: Embedding and storing in vector DB... ---")
    pinecone_service.upsert_document(
        user_id=state["user_id"], doc_id=state["doc_id"], text=state["text"]
    )
    return state

def decide_to_continue(state: DocumentState):
    """Determines whether to continue processing based on classification."""
    if state["classification"] == "Unsupported Document Type":
        return "end"
    else:
        return "continue"

# --- Graph Definition ---
graph = StateGraph(DocumentState)
graph.add_node("save", save_file)
graph.add_node("classify", extract_text_and_classify)
graph.add_node("get_full_analysis", get_full_analysis)
graph.add_node("embed", embed_and_store)

graph.set_entry_point("save")
graph.add_edge("save", "classify")
graph.add_conditional_edges(
    "classify",
    decide_to_continue,
    {
        "continue": "get_full_analysis",
        "end": END,
    },
)
graph.add_edge("get_full_analysis", "embed")
graph.add_edge("embed", END)

document_agent = graph.compile()
