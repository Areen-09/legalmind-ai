from fastapi.testclient import TestClient


def test_upload_document(client: TestClient, mock_agents, mock_storage):
    """
    Tests the successful upload of a document.
    """
    # Create a dummy file in memory
    mock_file_content = b"This is a dummy pdf file."
    files = {"file": ("test.pdf", mock_file_content, "application/pdf")}

    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 200
    json_response = response.json()
    assert "doc_id" in json_response
    assert json_response["doc_id"] == "mock-doc-id-456"
    assert "message" in json_response


def test_ask_question(client: TestClient, mock_agents):
    """
    Tests the /ask endpoint.
    """
    data = {
        "doc_id": "some-doc-id",
        "question": "What is the meaning of this document?",
    }
    response = client.post("/api/v1/ask", data=data)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["answer"] == "This is a mock answer."
    assert json_response["sources"] == []


def test_analyze_risks(client: TestClient, mock_agents):
    """
    Tests the /risk endpoint.
    """
    data = {"doc_id": "some-doc-id"}
    response = client.post("/api/v1/risk", data=data)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["risks"] == ["mock risk 1", "mock risk 2"]


def test_highlight_document(client: TestClient, mock_agents):
    """
    Tests the /highlight endpoint.
    """
    data = {
        "doc_id": "some-doc-id",
        "criteria": "termination clause",
    }
    response = client.post("/api/v1/highlight", data=data)

    assert response.status_code == 200
    json_response = response.json()
    assert "highlighted_sections" in json_response
    assert isinstance(json_response["highlighted_sections"], list)
