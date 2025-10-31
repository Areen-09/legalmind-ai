import io
import logging
import json
from fastapi import APIRouter, Depends, UploadFile, Form, HTTPException, Response
from fastapi.responses import StreamingResponse
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
        self._size_bytes: int = 0

    async def read_content(self, file: UploadFile):
        self._content = await file.read()
        self._size_bytes = len(self._content)

    @property
    def file(self):
        if self._content is None:
            return None
        # Provide a new, fresh stream every time .file is accessed
        return io.BytesIO(self._content)

    @property # <-- NEW
    def size_bytes(self) -> int: # <-- NEW
        """Returns the size of the file in bytes.""" # <-- NEW
        return self._size_bytes # <-- NEW

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

        file_size_bytes = readable_file.size_bytes
        # Invoke the main agent with all the necessary inputs
        result = main_agent.invoke({
            "user_id": user_id,
            "file": readable_file,
            "file_size_bytes": file_size_bytes,
            "qa_question": qa_question,
            "highlight_criteria": highlight_criteria
        })
        
        # The result from the main_agent is the final state
        # print(f"--- MAIN AGENT FINAL OUTPUT: {result} ---")
        
        # --- FIX: The 'file' object in the state is not JSON serializable ---
        # We need to remove it before returning the response.
        if "document_analysis" in result and "file" in result["document_analysis"]:
            del result["document_analysis"]["file"]

        return {
            "doc_id": result.get("doc_id"),
            "document_analysis": result.get("document_analysis"),
            "risks": result.get("risks"),
            "highlights": result.get("highlights"),
            "highlighted_doc_url": result.get("highlighted_doc_url"),
            "qa_response": result.get("qa_response"),
            "clause_explanation": result.get("clause_explanation"),
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
async def get_history(response: Response, current_user: dict = Depends(get_current_user)):
    """Retrieves the analysis history for the current user."""
    try:
        user_id = current_user['uid']
        history = storage_service.get_analysis_history(user_id)

        # 3. Set the cache header before returning
        # This tells the browser to cache this specific user's
        # data for 300 seconds (5 minutes).
        response.headers["Cache-Control"] = "private, max-age=60"

        return {"history": history}
    except Exception as e:
        logging.error(f"CRITICAL ERROR in /history endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")

# This map defines the progress percentage for each step in your main_agent
progress_map = {
    "__entry__": {"percentage": 0, "message": "Initializing..."},
    "save_file": {"percentage": 10, "message": "Saving file..."},
    "extract_text_and_classify": {"percentage": 20, "message": "Extracting text and classifying..."},
    "get_full_analysis": {"percentage": 30, "message": "Getting full analysis..."},
    "embed_and_store": {"percentage": 40, "message": "Embedding and storing in vector DB..."},
    "start_parallel": {"percentage": 50, "message": "Starting parallel analysis..."},
    "explain_clauses": {"percentage": 60, "message": "Explaining clauses..."},
    "find_highlights": {"percentage": 70, "message": "Finding highlights..."},
    "generate_qa": {"percentage": 80, "message": "Generating Q&A..."},
    "consolidate": {"percentage": 90, "message": "Consolidating results..."},
    "save_to_firestore": {"percentage": 95, "message": "Saving analysis to Firestore..."},
    "__end__": {"percentage": 100, "message": "Done!"}
}

def format_sse_message(data: dict) -> str:
    """Formats a dictionary into a Server-Sent Event message string."""
    return f"data: {json.dumps(data)}\n\n"

async def stream_analysis(
    user_id: str,
    file: UploadFile,
    qa_question: str,
    highlight_criteria: str
):
    """
    An async generator that streams the agent's progress.
    """
    try:
        # 1. Prepare file
        readable_file = ReReadableUploadFile(file)
        await readable_file.read_content(file)
        file_size_bytes = readable_file.size_bytes

        # 2. Prepare agent input
        input_dict = {
            "user_id": user_id,
            "file": readable_file,
            "file_size_bytes": file_size_bytes,
            "qa_question": qa_question,
            "highlight_criteria": highlight_criteria
        }

        final_state = {}
        current_percentage = -1 # Start at -1 to ensure first message (0%) is sent

        # 3. Stream the agent's execution
        async for chunk in main_agent.astream(input_dict):
            # The stream now yields chunks from the main graph and the sub-graph
            main_node_name = list(chunk.keys())[0]
            
            # Default to the main node name
            progress_node_name = main_node_name
            
            # If the chunk is from the document agent, unwrap the sub-graph's node name
            if main_node_name == "process_document":
                sub_chunk = chunk["process_document"]
                if sub_chunk:
                    progress_node_name = list(sub_chunk.keys())[0]

            if progress_node_name in progress_map:
                progress_info = progress_map[progress_node_name]
                
                if progress_info["percentage"] > current_percentage:
                    current_percentage = progress_info["percentage"]
                    yield format_sse_message(progress_info)
            
            # Store the latest state from the nodes as they run
            if main_node_name != "__end__" and chunk[main_node_name]:
                # If the sub-chunk is the final result, it won't have a node name key
                if main_node_name == "process_document" and "doc_id" in chunk[main_node_name]:
                    final_state.update(chunk[main_node_name])
                elif main_node_name != "process_document":
                    final_state.update(chunk[main_node_name])
        
        # 4. After the loop, send the final complete result
        
        # Clean up the state to remove non-serializable objects
        final_state.pop("file", None)
        final_state.pop("text", None)
        if "document_analysis" in final_state and "file" in final_state.get("document_analysis", {}):
            final_state["document_analysis"].pop("file", None)
        
        final_result = {
            "percentage": 100,
            "message": "Analysis complete!",
            "data": final_state # Send the whole final, clean state
        }
        yield format_sse_message(final_result)

    except Exception as e:
        # Send an error message over the stream
        logging.error(f"Error during analysis stream: {e}", exc_info=True)
        error_message = {
            "percentage": -1,
            "message": f"An error occurred: {e}",
            "error": True
        }
        yield format_sse_message(error_message)


@router.post("/analyze-stream")
async def analyze_document_stream(
    file: UploadFile,
    qa_question: str = Form("Summarize the key points of this document."),
    highlight_criteria: str = Form("Identify all clauses related to termination and liability."),
    current_user: dict = Depends(get_current_user)
):
    """
    A single endpoint to upload and fully analyze a document,
    streaming progress updates as Server-Sent Events.
    """
    print("--- /analyze-stream endpoint called ---")
    user_id = current_user['uid']
    
    # Create the async generator
    generator = stream_analysis(
        user_id=user_id,
        file=file,
        qa_question=qa_question,
        highlight_criteria=highlight_criteria
    )
    
    # Return it as a streaming response
    return StreamingResponse(generator, media_type="text/event-stream")
