# Legal Document Demystifier

The Legal Document Demystifier is a powerful AI-powered application designed to help users understand complex legal documents. By leveraging a sophisticated multi-agent system, this tool can analyze, summarize, and answer questions about your legal texts, making them more accessible and transparent.

## Features

-   **Comprehensive Document Analysis**: Upload a legal document, and the system will automatically classify it, extract key entities (like parties and dates), and identify important clauses.
-   **Risk Assessment**: The application intelligently identifies potential risks and obligations within the document, helping you understand your commitments.
-   **Intelligent Highlighting**: Key sections of the document are automatically highlighted based on their relevance and importance, drawing your attention to what matters most.
-   **Interactive Q&A**: Ask questions about the document in plain English and receive clear, context-aware answers. The system maintains a conversational memory, allowing for follow-up questions.
-   **Secure User Authentication**: The application uses Google for secure and easy user authentication, ensuring that your documents and data are protected.

## Architecture

The application is built with a modern, decoupled architecture, featuring a Python backend and a vanilla JavaScript frontend.

### Backend

The backend is powered by a multi-agent system built with **LangGraph**, a library for creating robust and stateful agentic applications. This system is composed of several specialized agents that work together to process and analyze documents:

-   **Main Agent**: The central orchestrator that manages the entire workflow, from document upload to final analysis.
-   **Document Agent**: Handles the initial processing of the document, including text extraction, classification, and entity recognition.
-   **Risk Analysis Agent**: Specializes in identifying and flagging potential risks and obligations.
-   **Highlighting Agent**: Intelligently highlights the most important sections of the document.
-   **Q&A Agent**: Manages the interactive question-and-answer functionality, providing context-aware responses.

The backend is built with **FastAPI** and communicates with the frontend through a RESTful API.

### Frontend

The frontend is a clean and intuitive single-page application (SPA) built with HTML, CSS, and vanilla JavaScript. It provides a user-friendly interface for uploading documents, viewing the analysis results, and interacting with the Q&A system.

## Getting Started

Follow these instructions to set up and run the Legal Document Demystifier on your local machine.

### Prerequisites

-   Python 3.12 or higher
-   Node.js and npm (for frontend dependencies, if any)
-   A Google Firebase project for authentication and storage
-   A Pinecone account for vector storage
-   A Google AI API key for the language model

### Backend Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Areen-09/legal_document_demystifier.git
    cd legal_document_demystifier/backend
    ```

2.  **Create a virtual environment**:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
    ```

3.  **Install the dependencies**:
    ```bash
    pip install -e .
    ```

4.  **Configure your environment variables**:
    Create a `.env` file in the `backend` directory and add the following, replacing the placeholder values with your actual credentials:
    ```
    GOOGLE_API_KEY="your_google_api_key"
    PINECONE_API_KEY="your_pinecone_api_key"
    PINECONE_ENVIRONMENT="your_pinecone_environment"
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH="path/to/your/firebase-service-account-key.json"
    ```

5.  **Run the backend server**:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will be running at `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory**:
    ```bash
    cd ../frontend
    ```

2.  **Open `index.html` in your browser**:
    You can open the `index.html` file directly in your web browser to use the application.

## Usage

1.  **Sign In**: Open the application and sign in with your Google account.
2.  **Upload a Document**: Use the form to upload a legal document for analysis.
3.  **View the Results**: The application will display a comprehensive analysis of the document, including its classification, key entities, risks, and highlights.
4.  **Ask Questions**: Use the Q&A section to ask specific questions about the document and receive detailed answers.

---

This README provides a comprehensive overview of the Legal Document Demystifier. If you have any questions or need further assistance, please feel free to open an issue in the repository.
