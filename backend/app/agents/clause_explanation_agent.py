from langgraph.graph import StateGraph, END
from app.services import llm_service
from typing import TypedDict

# --- State Definition ---
class ClauseExplanationState(TypedDict):
    discussion_text: str
    explanation: str

# --- Agent Steps ---

def explain_clauses(state: ClauseExplanationState):
    """Uses the LLM to explain the key clause discussion in simple terms."""
    print("--- CLAUSE EXPLANATION AGENT: Explaining clauses... ---")
    explanation = llm_service.explain_clauses(state["discussion_text"])
    state["explanation"] = explanation
    return state

# --- Graph Definition ---
graph = StateGraph(ClauseExplanationState)
graph.add_node("explain", explain_clauses)
graph.set_entry_point("explain")
graph.add_edge("explain", END)

clause_explanation_agent = graph.compile()
