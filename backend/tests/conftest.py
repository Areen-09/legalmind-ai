import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.dependencies import get_current_user


def override_get_current_user():
    """Override for testing - returns a mock user without checking auth"""
    return {
        "uid": "test-user-123",
        "email": "test@example.com"
    }


@pytest.fixture
def client():
    """
    Provides a FastAPI TestClient for making test requests.
    """
    # Override the dependency for all tests
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    
    yield client
    
    # Clean up after tests
    app.dependency_overrides.clear()


@pytest.fixture
def mock_agents(mocker):
    """
    Mocks all the LangGraph agents to prevent them from running during tests.
    """
    # Patch sub-agents (kept for compatibility if used elsewhere)
    mock_doc = mocker.patch("app.agents.document_agent.document_agent.invoke")
    mock_doc.return_value = {"doc_id": "mock-doc-id-456"}

    mock_qa = mocker.patch("app.agents.qa_agent.qa_agent.invoke")
    mock_qa.return_value = {"answer": "This is a mock answer.", "sources": []}

    mock_risk = mocker.patch("app.agents.risk_analysis_agent.risk_analysis_agent.invoke")
    mock_risk.return_value = {"risks": ["mock risk 1", "mock risk 2"]}

    mock_highlight = mocker.patch("app.agents.highlighting_agent.highlighting_agent.invoke")
    mock_highlight.return_value = {"highlighted_sections": ["section 1", "section 2"]}

    # Patch the main agent used by the /analyze endpoint to return a full analysis
    mock_main = mocker.patch("app.agents.main_agent.main_agent.invoke")
    mock_main.return_value = {
        "doc_id": "mock-doc-id-456",
        "document_analysis": {"summary": "mock summary"},
        "risks": ["mock risk 1", "mock risk 2"],
        "highlights": ["section 1", "section 2"],
        "highlighted_doc_url": "https://mock-url.com/file.pdf",
        "qa_response": {"answer": "This is a mock answer.", "sources": []},
        "clause_explanation": {"clause": "mock explanation"},
    }

    return {
        "document": mock_doc,
        "qa": mock_qa,
        "risk": mock_risk,
        "highlight": mock_highlight,
        "main": mock_main,
    }


@pytest.fixture
def mock_storage(mocker):
    """
    Mocks Firebase storage.
    """
    mock_bucket = mocker.patch("app.core.firebase.storage.bucket")
    mock_blob = mock_bucket.return_value.blob.return_value
    mock_blob.upload_from_string.return_value = None
    mock_blob.public_url = "https://mock-url.com/file.pdf"
    
    # Also mock storage_service.get_analysis_history to return a predictable history
    mock_history = mocker.patch("app.services.storage_service.get_analysis_history")
    mock_history.return_value = [
        {"doc_id": "mock-doc-id-456", "filename": "test.pdf", "timestamp": "2025-01-01T00:00:00"}
    ]

    return {
        "bucket": mock_bucket,
        "blob": mock_blob,
        "history": mock_history,
    }