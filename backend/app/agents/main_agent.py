from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any

from app.agents.document_agent import document_agent, DocumentState
from app.agents.highlighting_agent import highlighting_agent, HighlightState
from app.agents.qa_agent import qa_agent, QAState
from app.agents.risk_analysis_agent import risk_analysis_agent, RiskAnalysisState
from app.services import storage_service


# --- Global State Definition ---
class MainState(TypedDict):
    user_id: str
    file: Any
    doc_id: str
    text: str
    # Outputs from all agents
    document_analysis: Dict[str, Any]
    highlights: List[str]
    highlighted_doc_url: str  # Add this line
    qa_response: Dict[str, Any]
    risks: List[str]
    # Input for specific agents
    qa_question: str
    highlight_criteria: str

# --- Agent Runner Nodes ---

def run_document_agent(state: MainState):
    """Runs the document processing agent and returns only the updated state."""
    print("--- MAIN AGENT: Running Document Agent ---")
    doc_state = DocumentState(user_id=state["user_id"], file=state["file"])
    result = document_agent.invoke(doc_state)
    
    # Safely access the results, providing defaults if keys are missing
    return {
        "doc_id": result.get("doc_id"),
        "text": result.get("text"),
        "document_analysis": {
            "classification": result.get("classification"),
            "entities": result.get("entities", []),
            "clauses": result.get("clauses", []),
        }
    }

def run_risk_analysis_agent(state: MainState):
    """Runs the risk analysis agent and returns only the updated state."""
    print("--- MAIN AGENT: Running Risk Analysis Agent ---")
    risk_state = RiskAnalysisState(user_id=state["user_id"], doc_id=state["doc_id"])
    result = risk_analysis_agent.invoke(risk_state)
    return {"risks": result["risks"]}

def run_highlighting_agent(state: MainState):
    """Runs the highlighting agent and returns only the updated state."""
    print("--- MAIN AGENT: Running Highlighting Agent ---")
    
    criteria = state.get("highlight_criteria") or state["document_analysis"].get("highlight_suggestions", "general legal review")

    highlight_state = HighlightState(
        user_id=state["user_id"],
        doc_id=state["doc_id"],
        criteria=criteria
    )
    result = highlighting_agent.invoke(highlight_state)
    return {
        "highlights": result["highlighted_sections"],
        "highlighted_doc_url": result["highlighted_doc_url"],
    }

def run_qa_agent(state: MainState):
    """Runs the Q&A agent and returns only the updated state."""
    print("--- MAIN AGENT: Running QA Agent ---")
    qa_state = QAState(
        user_id=state["user_id"],
        doc_id=state["doc_id"],
        question=state.get("qa_question", "Summarize the document."),
        chat_history=[]
    )
    result = qa_agent.invoke(qa_state)
    return {
        "qa_response": {
            "answer": result["answer"],
            "sources": result["sources"]
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
    return {}

def save_to_firestore(state: MainState):
    """Saves the final analysis to Firestore."""
    print("--- MAIN AGENT: Saving analysis to Firestore ---")
    analysis_data = {
        "document_analysis": state["document_analysis"],
        "risks": state["risks"],
        "highlights": state["highlights"],
        "highlighted_doc_url": state["highlighted_doc_url"],
        "qa_response": state["qa_response"],
    }
    storage_service.save_analysis_to_firestore(state["user_id"], state["doc_id"], analysis_data)
    return {}

# --- Graph Definition ---
graph = StateGraph(MainState)

graph.add_node("process_document", run_document_agent)
graph.add_node("start_parallel", start_parallel_analysis)
graph.add_node("analyze_risks", run_risk_analysis_agent)
graph.add_node("find_highlights", run_highlighting_agent)
graph.add_node("answer_questions", run_qa_agent)
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

# 2. From the parallel start node, fan out to the analysis agents
graph.add_edge("start_parallel", "analyze_risks")
graph.add_edge("start_parallel", "find_highlights")
graph.add_edge("start_parallel", "answer_questions")

# 3. After all parallel agents are done, consolidate
graph.add_edge("analyze_risks", "consolidate")
graph.add_edge("find_highlights", "consolidate")
graph.add_edge("answer_questions", "consolidate")

# 4. Save to Firestore
graph.add_edge("consolidate", "save_to_firestore")

# 5. End the workflow
graph.add_edge("save_to_firestore", END)

main_agent = graph.compile()
