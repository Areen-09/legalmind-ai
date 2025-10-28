import fitz # PyMuPDF
import uuid
from app.core.firebase import get_firebase_storage, get_firestore_client
from fastapi import UploadFile
from io import BytesIO
import datetime
import tempfile
import os

# --- CORE FUNCTIONS ---

def save_document(user_id: str, file: UploadFile) -> str:
    """Saves a document to Firebase Storage and its metadata to Firestore."""
    db = get_firestore_client()
    bucket = get_firebase_storage()
    doc_id = str(uuid.uuid4())
    
    # 1. Save metadata to Firestore
    doc_ref = db.collection("users").document(user_id).collection("analyses").document(doc_id)
    doc_ref.set({
        "filename": file.filename,
        "doc_id": doc_id,
        "status": "processing",
        "timestamp": datetime.datetime.utcnow(),
    })

    # 2. Upload file to Storage
    blob = bucket.blob(f"{user_id}/{doc_id}/{file.filename}")
    blob.upload_from_file(file.file, content_type=file.content_type)
    
    return doc_id


def extract_text(file_bytes: bytes) -> str:
    """
    Extracts text from a file's byte content, normalizing and cleaning it.
    """
    text = ""
    try:
        # Open the PDF from the byte stream
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            # Iterate through each page and extract text
            for page in doc:
                page_text = page.get_text("text", textpage=None, sort=False)
                
                # --- FIX: Normalize and clean the text ---
                # 1. Normalize to NFKC to handle various unicode characters
                # 2. Encode to ASCII, ignoring errors, to remove problematic chars
                # 3. Decode back to UTF-8
                cleaned_text = page_text.encode('ascii', 'ignore').decode('utf-8')
                text += cleaned_text
    except Exception as e:
        print(f"Error extracting text with fitz: {e}")
        # Fallback or error handling can be added here
        return "" # Return empty string on failure
        
    return text

def get_document_text(user_id: str, doc_id: str) -> str:
    """Retrieves a document from storage and extracts its text using metadata from Firestore."""
    db = get_firestore_client()
    bucket = get_firebase_storage()

    # 1. Get filename from Firestore
    doc_ref = db.collection("users").document(user_id).collection("analyses").document(doc_id)
    doc_snapshot = doc_ref.get()
    if not doc_snapshot.exists:
        raise FileNotFoundError(f"No metadata found for doc_id {doc_id}")
    
    filename = doc_snapshot.to_dict().get("filename")
    if not filename:
        raise ValueError("Filename not found in Firestore metadata.")

    # 2. Download from Storage
    blob = bucket.blob(f"{user_id}/{doc_id}/{filename}")
    file_bytes = blob.download_as_bytes()
    
    # 3. Extract text
    return extract_text(file_bytes)

# --- HISTORY FUNCTIONS ---

def save_analysis_to_firestore(user_id: str, doc_id: str, analysis_data: dict):
    """Saves the complete analysis results to Firestore."""
    db = get_firestore_client()
    doc_ref = db.collection("users").document(user_id).collection("analyses").document(doc_id)
    
    # Merge the new data with existing metadata
    doc_ref.set({
        "status": "completed",
        **analysis_data
    }, merge=True)

def get_analysis_history(user_id: str) -> list:
    """Retrieves the analysis history for a given user."""
    db = get_firestore_client()
    history_ref = db.collection("users").document(user_id).collection("analyses")
    
    # Order by timestamp to get the most recent first
    query = history_ref.order_by("timestamp", direction="DESCENDING")
    
    history = []
    for doc in query.stream():
        data = doc.to_dict()
        # Convert timestamp to ISO 8601 string
        if 'timestamp' in data and hasattr(data['timestamp'], 'isoformat'):
            data['timestamp'] = data['timestamp'].isoformat()
        history.append(data)
        
    return history


def download_document(user_id: str, doc_id: str) -> tuple[str, str]:
    """Downloads a document from Firebase Storage and returns its local path and filename."""
    db = get_firestore_client()
    bucket = get_firebase_storage()

    # Get filename from Firestore
    doc_ref = db.collection("users").document(user_id).collection("analyses").document(doc_id)
    doc_snapshot = doc_ref.get()
    if not doc_snapshot.exists:
        raise FileNotFoundError(f"No metadata found for doc_id {doc_id}")
    
    filename = doc_snapshot.to_dict().get("filename")
    if not filename:
        raise ValueError("Filename not found in Firestore metadata.")

    # Download from Storage
    blob = bucket.blob(f"{user_id}/{doc_id}/{filename}")
    local_path = os.path.join(tempfile.gettempdir(), filename)
    blob.download_to_filename(local_path)
    
    return local_path, filename

def upload_highlighted_document(user_id: str, doc_id: str, local_path: str) -> str:
    """Uploads a highlighted document to Firebase Storage and returns its public URL."""
    bucket = get_firebase_storage()
    filename = local_path.split("/")[-1]
    blob = bucket.blob(f"{user_id}/{doc_id}/{filename}")
    
    blob.upload_from_filename(local_path)
    
    # Make the blob publicly accessible and return the URL
    blob.make_public()
    return blob.public_url
