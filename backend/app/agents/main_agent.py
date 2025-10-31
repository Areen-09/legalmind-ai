from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any

from app.agents.document_agent import document_agent, DocumentState
from app.agents.highlighting_agent import highlighting_agent, HighlightState
from app.agents.qa_agent import qa_agent, QAState
from app.agents.risk_analysis_agent import risk_analysis_agent, RiskAnalysisState
from app.agents.clause_explanation_agent import clause_explanation_agent, ClauseExplanationState
from app.services import storage_service


# --- Global State Definition ---
class MainState(TypedDict):
    user_id: str
    file: Any
    file_size_bytes: int
    doc_id: str
    text: str
    # Outputs from all agents
    document_analysis: Dict[str, Any]
    highlights: List[str]
    highlighted_doc_url: str
    qa_response: Dict[str, Any]
    risks: List[str]
    clause_explanation: str
    # Input for specific agents
    qa_question: str
    highlight_criteria: str

# --- Agent Runner Nodes ---

def run_document_agent(state: MainState):
    """
    Runs the document processing agent and correctly structures its output
    for the main state.
    """
    print("--- MAIN AGENT: Running Document Agent ---")
    # Initial state for the sub-agent
    doc_state = DocumentState(user_id=state["user_id"], file=state["file"])
    
    # Invoke the sub-agent
    result = document_agent.invoke(doc_state)
    
    # --- FIX: The document_agent returns a flat dictionary (DocumentState). ---
    # We need to structure this into the nested 'document_analysis' format
    # that the main agent's state expects.
    
    # The result from the sub-agent IS the full analysis.
    # We need to structure this into the main state, pulling out top-level keys.
    return {
        "doc_id": result.get("doc_id"),
        "text": result.get("text"),
        "document_analysis": result,  # The entire result is the analysis
        "risks": result.get("risks", []),  # Explicitly pull risks into the main state
    }


def run_clause_explanation_agent(state: MainState):
    """Runs the clause explanation agent."""
    print("--- MAIN AGENT: Running Clause Explanation Agent ---")
    discussion_text = state["document_analysis"].get("key_clause_discussion", "")
    explanation_state = ClauseExplanationState(discussion_text=discussion_text)
    result = clause_explanation_agent.invoke(explanation_state)
    # print(f"--- CLAUSE EXPLANATION AGENT OUTPUT: {result} ---")
    return {"clause_explanation": result["explanation"]}

def run_highlighting_agent(state: MainState):
    """Runs the highlighting agent and returns only the updated state."""
    print("--- MAIN AGENT: Running Highlighting Agent ---")
    
    highlights = state["document_analysis"].get("highlights")
    
    if not highlights:
        return {
            "highlights": [],
            "highlighted_doc_url": None,
        }

    highlight_state = HighlightState(
        user_id=state["user_id"],
        doc_id=state["doc_id"],
        highlights=highlights
    )
    result = highlighting_agent.invoke(highlight_state)
    # print(f"--- HIGHLIGHTING AGENT OUTPUT: {result} ---")
    return {
        "highlights": result.get("highlighted_sections", []),
        "highlighted_doc_url": result.get("highlighted_doc_url"),
    }

def run_qa_agent(state: MainState):
    """Runs the Q&A agent and returns only the updated state."""
    print("--- MAIN AGENT: Running QA Agent ---")
    # The entire 'questions' list from the document analysis is the context
    # for our "Q&A" agent, which is really more of a "Generated Questions" agent.
    questions = state["document_analysis"].get("questions", [])
    
    # We're not invoking a separate agent here anymore.
    # We are just formatting the data from the document_analysis step.
    # The `qa_agent` is now only for the interactive '/ask' endpoint.
    return {
        "qa_response": {
            "questions": questions
        }
    }

def decide_to_continue(state: MainState):
    """Determines whether to continue processing based on classification."""
    if state["document_analysis"].get("classification") == "Unsupported Document Type":
        print("--- MAIN AGENT: Unsupported document type. Ending workflow. ---")
        return "end"
    else:
        print("--- MAIN AGENT: Document supported. Starting parallel analysis. ---")
        return "continue"

def start_parallel_analysis(state: MainState):
    """A dummy node to serve as the entry point for parallel branches."""
    return {}

def consolidate_results(state: MainState):
    """A dummy node to consolidate results from parallel branches."""
    print("--- MAIN AGENT: Consolidating all results ---")
    # No longer need to calculate risk score here, it's in document_analysis
    return {}

def save_to_firestore(state: MainState):
    """Saves the final, consolidated analysis to Firestore."""
    print("--- MAIN AGENT: Saving analysis to Firestore ---")
    
    # --- FIX: Create a clean, serializable copy of the state for storage ---
    # This ensures that the data saved to Firestore is consistent with
    # what the /analyze endpoint returns.
    
    # Create a shallow copy to avoid modifying the original state
    analysis_data = state.copy()
    
    # Remove non-serializable or unnecessary fields before saving
    analysis_data.pop("file", None)
    analysis_data.pop("text", None) # Text is large and already in vector DB
    
    # The 'document_analysis' might also contain the file object
    if "document_analysis" in analysis_data and "file" in analysis_data["document_analysis"]:
        # Create a copy to modify
        analysis_data["document_analysis"] = analysis_data["document_analysis"].copy()
        analysis_data["document_analysis"].pop("file", None)

    storage_service.save_analysis_to_firestore(
        user_id=state["user_id"],
        doc_id=state["doc_id"],
        analysis_data=analysis_data
    )
    return {}

# --- Graph Definition ---
graph = StateGraph(MainState)

graph.add_node("process_document", run_document_agent)
graph.add_node("start_parallel", start_parallel_analysis)
graph.add_node("explain_clauses", run_clause_explanation_agent)
graph.add_node("generate_qa", run_qa_agent) # New QA node
graph.add_node("find_highlights", run_highlighting_agent)
graph.add_node("consolidate", consolidate_results)
graph.add_node("save_to_firestore", save_to_firestore)

# --- Graph Connections ---
graph.set_entry_point("process_document")

# 1. After processing, decide whether to continue or end
graph.add_conditional_edges(
    "process_document",
    decide_to_continue,
    {
        "continue": "start_parallel",
        "end": END,
    },
)

# 2. From the parallel start node, fan out to the parallel agents
graph.add_edge("start_parallel", "explain_clauses")
graph.add_edge("start_parallel", "find_highlights")
graph.add_edge("start_parallel", "generate_qa") # Add QA to parallel execution

# 3. After all parallel agents are done, consolidate
graph.add_edge("explain_clauses", "consolidate")
graph.add_edge("find_highlights", "consolidate")
graph.add_edge("generate_qa", "consolidate")

# 4. Save to Firestore
graph.add_edge("consolidate", "save_to_firestore")

# 5. End the workflow
graph.add_edge("save_to_firestore", END)

main_agent = graph.compile()
