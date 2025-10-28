from fastapi.testclient import TestClient


def test_analyze_document(client: TestClient, mock_agents, mock_storage):
    """Tests the /analyze endpoint which uploads and runs a full analysis."""
    mock_file_content = b"This is a dummy pdf file."
    files = {"file": ("test.pdf", mock_file_content, "application/pdf")}
    data = {
        "qa_question": "Summarize the key points.",
        "highlight_criteria": "termination"
    }

    response = client.post("/api/v1/analyze", files=files, data=data)
    assert response.status_code == 200
    json_response = response.json()
    assert json_response.get("doc_id") == "mock-doc-id-456"
    assert "document_analysis" in json_response
    assert json_response["risks"] == ["mock risk 1", "mock risk 2"]
    assert json_response["highlights"] == ["section 1", "section 2"]


def test_ask_question(client: TestClient, mock_agents):
    """Tests the /ask endpoint (conversational QA)."""
    data = {"doc_id": "some-doc-id", "question": "What is the meaning?"}
    response = client.post("/api/v1/ask", data=data)
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["answer"] == "This is a mock answer."
    assert json_response["sources"] == []


def test_get_history(client: TestClient, mock_storage):
    """Tests the /history endpoint which returns saved analyses."""
    response = client.get("/api/v1/history")
    assert response.status_code == 200
    json_response = response.json()
    assert "history" in json_response
    assert isinstance(json_response["history"], list)
