from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Config(BaseSettings):
    # App
    app_name: str = "Contract AI Assistant"
    debug: bool = False

    # LLM
    model_name: str = "gemini-2.5-flash"
    embedding_model_name: str = "models/gemini-embedding-001"
    google_api_key: str 

    # Pinecone
    pinecone_api_key: str 
    pinecone_environment: str 
    pinecone_index_name: str

    # Storage  
    firebase_storage_bucket: str 

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


config = Config()