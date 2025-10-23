import json
import re
from langgraph.graph import StateGraph, END
from app.services import llm_service, storage_service
from typing import TypedDict, List

# --- State Definition ---
class RiskAnalysisState(TypedDict):
    user_id: str
    doc_id: str
    text: str
    risks: List[str]

# --- Agent Steps ---

def get_document_text(state: RiskAnalysisState):
    """
    Retrieves the full text of the document from storage.
    """
    print("--- RISK AGENT: Retrieving document text... ---")
    text = storage_service.get_document_text(state["user_id"], state["doc_id"])
    state["text"] = text
    return state

def analyze_risks(state: RiskAnalysisState):
    """
    Analyzes the document text for risks and obligations, now with
    robust JSON parsing for the LLM's response.
    """
    print("--- RISK AGENT: Analyzing text for risks... ---")
    raw_result = llm_service.extract_risks_and_obligations(state["text"])

    # --- FIX: Added robust JSON parsing ---
    try:
        # Clean the raw string to remove markdown formatting
        clean_json_str = re.sub(r'```json\s*|\s*```', '', raw_result, flags=re.DOTALL)
        result = json.loads(clean_json_str)
        
        # Safely get the 'risks' key, defaulting to an empty list
        state["risks"] = result.get("risks", [])
        print("--- RISK AGENT: Successfully parsed risks. ---")

    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        # This block catches errors if the LLM returns a malformed string
        print(f"--- ❌ RISK AGENT ERROR: Failed to parse LLM output. Error: {e} ---")
        print(f"--- Raw LLM output was: {raw_result} ---")
        # Default to an empty list to prevent crashes
        state["risks"] = []
        
    return state

# --- Graph Definition ---
graph = StateGraph(RiskAnalysisState)
graph.add_node("retrieve_text", get_document_text)
graph.add_node("analyze", analyze_risks)

graph.set_entry_point("retrieve_text")
graph.add_edge("retrieve_text", "analyze")
graph.add_edge("analyze", END)

risk_analysis_agent = graph.compile()