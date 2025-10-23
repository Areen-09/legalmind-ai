from pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import config

pc = Pinecone(api_key=config.pinecone_api_key)
index = pc.Index(name=config.pinecone_index_name)
embeddings_model = GoogleGenerativeAIEmbeddings(
    model=config.embedding_model_name,
    google_api_key=config.google_api_key
)

# --- FUNCTIONS ---

def embed_text(text: str) -> list[float]:
    """Generate embedding for text chunk."""
    return embeddings_model.embed_query(text)

def upsert_document(user_id: str, doc_id: str, text: str):
    """Chunk text, embed, and upsert into Pinecone."""
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    vectors = []
    for i, chunk in enumerate(chunks):
        emb = embed_text(chunk)
        vectors.append({
            "id": f"{doc_id}_{i}",
            "values": emb,
            "metadata": {"user_id": user_id, "doc_id": doc_id, "text": chunk}
        })
    index.upsert(vectors=vectors, namespace=user_id)

def query(user_id: str, doc_id: str, query: str):
    """Search relevant chunks in Pinecone."""
    emb = embed_text(query)
    resp = index.query(
        vector=emb,
        top_k=5,
        namespace=user_id,
        filter={"doc_id": {"$eq": doc_id}} if doc_id else {},
        include_metadata=True
    )
    return [m.metadata for m in resp.matches if m.metadata is not None]
