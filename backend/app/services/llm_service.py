from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import config

# Initialize the Language Model
llm = ChatGoogleGenerativeAI(model=config.model_name, google_api_key=config.google_api_key)

def classify_document(text: str) -> str:
    """Uses the LLM to classify the type of document and validate it."""
    supported_doctypes = [
        "Non-Disclosure Agreements (NDAs)",
        "Employment Contracts",
        "Rental & Lease Agreements",
        "Terms of Service",
        "Privacy Policies",
        "General Business Contracts",
        "Sales Agreements",
        "Service Contracts",
    ]
    
    prompt = f"""
    Based on the following text, what is the primary classification of this document?
    Choose from the following list, or classify as "Other" if it does not fit:
    {', '.join(supported_doctypes)}

    Return only the classification name.

    Text:
    ---
    {text[:2000]}
    """
    response = llm.invoke(prompt)
    classification = response.content.strip()

    if classification not in supported_doctypes:
        return "Unsupported Document Type"
    
    return classification


def extract_entities_and_clauses(text: str) -> str:
    """Uses the LLM to extract key entities and clauses from a document."""
    prompt = f"""
    Analyze the following document text and extract key information.
    Return your response as a single, clean JSON object with the following structure:
    {{
      "contract_details": {{
        "parties": [{{ "name": "...", "role": "..." }}],
        "dates": {{ "agreement_date": {{ "day": "...", "month": "...", "year": "..." }} }},
        "amounts": [{{ "description": "...", "value": "..." }}],
        "clauses": [{{ "section": "...", "sub_section": "...", "text": "..." }}]
      }}
    }}

    Text:
    ---
    {text}
    """
    response = llm.invoke(prompt)
    return response.content

def extract_risks_and_obligations(text: str) -> str:
    """Uses the LLM to identify potential risks and obligations in a document."""
    prompt = f"""
    Analyze the following document text for potential risks, liabilities, and key obligations for the parties involved.
    Return your response as a single, clean JSON object with the following structure:
    {{
      "risks": ["A description of a potential risk...", "Another potential risk..."]
    }}

    Text:
    ---
    {text}
    """
    response = llm.invoke(prompt)
    return response.content

def find_sections_for_highlighting(text: str, criteria: str) -> str:
    """
    New function: Uses the LLM to find text sections that match a given criteria.
    """
    prompt = f"""
    Analyze the following document text. Your task is to find and extract all sentences or short paragraphs that are directly related to the following criteria: "{criteria}".

    Return your response as a single, clean JSON object with the following structure:
    {{
      "sections": ["The first matching text section...", "The second matching text section...", "..."]
    }}

    Text:
    ---
    {text}
    """
    response = llm.invoke(prompt)
    return response.content
