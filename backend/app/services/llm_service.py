from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import config
from app.core.prompts import MAIN_SYSTEM_PROMPT, WORKFLOW_PROMPTS, CLAUSE_EXPLANATION_PROMPT
import json

# Initialize the Language Model
llm = ChatGoogleGenerativeAI(model=config.model_name, google_api_key=config.google_api_key)

def classify_document(text: str) -> str:
    """Uses the LLM to classify the type of document and validate it."""
    supported_doctypes = list(WORKFLOW_PROMPTS.keys())
    
    prompt = f"""
    Analyze the text below and classify it into one of the following categories:
    {', '.join(supported_doctypes)}

    - If the document is a legal document but does not fit into any of the specific categories above, classify it as "General Legal Document".
    - If the document is not a legal document, classify it as "Unsupported Document Type".

    Return only the single classification name and nothing else.

    Text:
    ---
    {text[:2000]}
    """
    response = llm.invoke(prompt)
    classification = response.content.strip()

    all_valid_classifications = supported_doctypes + ["Unsupported Document Type"]

    if classification in all_valid_classifications:
        return classification
    else:
        # Fallback for unexpected model responses
        return "Unsupported Document Type"

def get_full_analysis(text: str, classification: str) -> dict:
    """Generates a full analysis of the document based on its classification."""
    prompt_template = WORKFLOW_PROMPTS.get(classification)
    if not prompt_template:
        raise ValueError(f"No prompt template found for classification: {classification}")

    # Construct the full prompt
    full_prompt = f"""
    {MAIN_SYSTEM_PROMPT}

    {prompt_template['instructions']}

    Document Text:
    ---
    {text}
    ---

    Instructions: Generate a JSON response with the following structure: {prompt_template['json_structure']}
    
    1. Summary (summary): {prompt_template['summary_prompt']}
    2. Key Clause Discussion (key_clause_discussion): {prompt_template['key_clause_discussion_prompt']}
    3. Risks (risks): {prompt_template['risks_prompt']}
    4. Risk Score (risk_score): {prompt_template['risk_score_prompt']}
    5. Questions (questions): Answer the following based only on the text. If not found, state "Not specified."
    {json.dumps(prompt_template['questions'], indent=4)}
    6. Highlights (highlights): Extract the exact, verbatim text for the following. If not found, state "Not Found."
    {json.dumps(prompt_template['highlights'], indent=4)}
    """
    
    response = llm.invoke(full_prompt)
    
    # Extract the JSON part of the response
    import re
    json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
    if not json_match:
        raise ValueError("No JSON object found in the LLM's response.")
    
    return json.loads(json_match.group(0))


def explain_clauses(discussion_text: str) -> str:
    """Uses the LLM to explain the key clause discussion in simple terms."""
    prompt = CLAUSE_EXPLANATION_PROMPT.format(discussion_text=discussion_text)
    response = llm.invoke(prompt)
    return response.content
