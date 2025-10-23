from fastapi import FastAPI
from app.api.v1 import routes
from app.core.config import config
from app.core.logging import setup_logging
from app.core import firebase

setup_logging()
# 1. Import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 2. Add the CORS middleware to your app
origins = [
    "http://localhost",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://127.0.0.1:5500/frontend/index.html" # The default port for python's http.server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Allows specified origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)



# Register routes
app.include_router(routes.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Contract AI Assistant is running 🚀"}