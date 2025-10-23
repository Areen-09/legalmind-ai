import io
import logging
from fastapi import APIRouter, Depends, UploadFile, Form, HTTPException
from app.agents.main_agent import main_agent
from app.agents.qa_agent import qa_agent
from .dependencies import get_current_user
from typing import Dict, List, Tuple
from app.services import storage_service


# --- In-Memory Chat Session Storage ---
# This simple dictionary will store chat histories.
# The key will be a tuple of (user_id, doc_id)
# The value will be a list of (question, answer) tuples.
chat_sessions: Dict[Tuple[str, str], List[Tuple[str, str]]] = {}


# A helper class to handle file streams safely across multiple agent steps
class ReReadableUploadFile:
    def __init__(self, file: UploadFile):
        self.filename = file.filename
        self.content_type = file.content_type
        self._content = None

    async def read_content(self, file: UploadFile):
        self._content = await file.read()

    @property
    def file(self):
        if self._content is None:
            return None
        # Provide a new, fresh stream every time .file is accessed
        return io.BytesIO(self._content)

router = APIRouter()

@router.post("/analyze")
async def analyze_document(
    file: UploadFile,
    qa_question: str = Form("Summarize the key points of this document."),
    highlight_criteria: str = Form("Identify all clauses related to termination and liability."),
    current_user: dict = Depends(get_current_user)
):
    """
    A single endpoint to upload and fully analyze a document.
    """
    try:
        user_id = current_user['uid']
        
        # Create a re-readable file object to pass to the agent
        readable_file = ReReadableUploadFile(file)
        await readable_file.read_content(file)

        # Invoke the main agent with all the necessary inputs
        result = main_agent.invoke({
            "user_id": user_id,
            "file": readable_file,
            "qa_question": qa_question,
            "highlight_criteria": highlight_criteria
        })
        
        # The result from the main_agent is the final state
        return {
            "doc_id": result.get("doc_id"),
            "document_analysis": result.get("document_analysis"),
            "risks": result.get("risks"),
            "highlights": result.get("highlights"),
            "highlighted_doc_url": result.get("highlighted_doc_url"),
            "qa_response": result.get("qa_response")
        }


    except Exception as e:
        logging.error(f"CRITICAL ERROR in /analyze endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


@router.post("/ask")
async def ask_question(doc_id: str = Form(...), question: str = Form(...), current_user: dict = Depends(get_current_user)):
    """
    Asks a question about a document, now with conversational memory.
    """
    try:
        user_id = current_user['uid']
        
        # --- 1. Manage Session History ---
        session_key = (user_id, doc_id)
        chat_history = chat_sessions.get(session_key, [])
        print(f"--- history for session {session_key}: {len(chat_history)} previous exchanges. ---")

        # --- 2. Invoke Agent with History ---
        result = qa_agent.invoke({
            "user_id": user_id,
            "doc_id": doc_id,
            "question": question,
            "chat_history": chat_history # Pass the history to the agent
        })

        # --- 3. Update History and Store It ---
        new_answer = result.get("answer", "No answer found.")
        chat_history.append((question, new_answer))
        chat_sessions[session_key] = chat_history
        
        return {"answer": new_answer, "sources": result.get("sources", [])}

    except Exception as e:
        logging.error(f"CRITICAL ERROR in /ask endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Retrieves the analysis history for the current user."""
    try:
        user_id = current_user['uid']
        history = storage_service.get_analysis_history(user_id)
        return {"history": history}
    except Exception as e:
        logging.error(f"CRITICAL ERROR in /history endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")
