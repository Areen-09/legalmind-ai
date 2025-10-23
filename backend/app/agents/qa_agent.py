from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from app.services import pinecone_service
from app.core.config import config
from typing import List, TypedDict

# --- 1. Updated State Definition ---
# Added 'sources' and 'chat_history' to the state.
class QAState(TypedDict):
    user_id: str
    doc_id: str
    question: str
    chat_history: List[tuple[str, str]] # List of (human_question, ai_answer)
    context: str
    answer: str
    sources: List[dict] # Will hold the retrieved chunks with their metadata

# --- Agent Steps ---

def retrieve_context(state: QAState):
    """
    Retrieves relevant text chunks from Pinecone and stores them.
    """
    print("--- AGENT STEP: Retrieving context... ---")
    chunks = pinecone_service.query(
        user_id=state["user_id"],
        doc_id=state.get("doc_id"),
        query=state["question"]
    )
    # --- 2. Store both the context string and the original source chunks ---
    state["context"] = "\n".join([c["text"] for c in chunks])
    state["sources"] = chunks # Save the full source objects
    return state

def generate_answer(state: QAState):
    """
    Generates an answer using the LLM, now including chat history for context.
    """
    print("--- AGENT STEP: Generating answer... ---")
    llm = ChatGoogleGenerativeAI(model=config.model_name, google_api_key=config.google_api_key)

    # --- 3. Format chat history for the prompt ---
    history = state.get("chat_history", [])
    history_str = "\n".join([f"Human: {q}\nAI: {a}" for q, a in history])

    prompt = (
        "You are a helpful assistant. Answer the user's question based on the"
        " provided context and chat history.\n\n"
        f"Chat History:\n{history_str}\n\n"
        f"Context from the document:\n{state['context']}\n\n"
        f"Question: {state['question']}"
    )

    response = llm.invoke(prompt)
    state["answer"] = response.content
    return state

# --- Graph Definition ---
graph = StateGraph(QAState)
graph.add_node("retrieve", retrieve_context)
graph.add_node("answer", generate_answer)

graph.set_entry_point("retrieve")
graph.add_edge("retrieve", "answer")
graph.add_edge("answer", END)

qa_agent = graph.compile()
