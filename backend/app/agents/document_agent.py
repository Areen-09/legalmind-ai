import json
import re
from langgraph.graph import StateGraph, END
from app.services import storage_service, pinecone_service, llm_service
from typing import TypedDict, List

# --- State Definition ---
class DocumentState(TypedDict):
    user_id: str
    file: object # The re-readable file object
    doc_id: str
    text: str
    classification: str
    entities: list
    clauses: list
    highlight_suggestions: str

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

def extract_entities_and_clauses(state: DocumentState):
    """
    Extracts key entities and clauses from the document text.
    Includes robust parsing for the LLM's response.
    """
    print("--- AGENT STEP: Extracting entities and clauses... ---")
    raw_result = llm_service.extract_entities_and_clauses(state["text"])
    
    # Clean the raw string: remove markdown backticks and 'json' identifier
    clean_json_str = re.sub(r'```json\s*|\s*```', '', raw_result, flags=re.DOTALL)

    try:
        result = json.loads(clean_json_str)
        
        # The LLM is returning a different structure, so we adapt to it.
        # We look inside 'contract_details' for the keys we need.
        contract_details = result.get("contract_details", {})
        
        # Safely get entities and clauses, defaulting to empty lists.
        state["entities"] = contract_details.get("parties", [])
        clauses = contract_details.get("clauses", [])
        state["clauses"] = clauses

        # --- FIX: Handle variable clause structures from the LLM ---
        suggestions = []
        for clause in clauses:
            if isinstance(clause, dict) and "clause_name" in clause:
                suggestions.append(clause["clause_name"])
            elif isinstance(clause, str):
                suggestions.append(clause.split(":")[0]) # Handle simple strings
        
        state["highlight_suggestions"] = "Key clauses: " + ", ".join(suggestions)
        print("--- AGENT STEP: Successfully parsed entities and clauses. ---")

    except (json.JSONDecodeError, TypeError) as e:
        print(f"--- ❌ AGENT ERROR: Failed to parse LLM output. Error: {e} ---")
        print(f"--- Raw LLM output was: {raw_result} ---")
        state["entities"] = []
        state["clauses"] = []
        
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
graph.add_node("extract", extract_entities_and_clauses)
graph.add_node("embed", embed_and_store)

graph.set_entry_point("save")
graph.add_edge("save", "classify")
graph.add_conditional_edges(
    "classify",
    decide_to_continue,
    {
        "continue": "extract",
        "end": END,
    },
)
graph.add_edge("extract", "embed")
graph.add_edge("embed", END)

document_agent = graph.compile()

