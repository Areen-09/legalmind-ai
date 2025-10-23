from app.agents.document_agent import document_agent
from app.agents.highlighting_agent import highlighting_agent
from app.agents.qa_agent import qa_agent
from app.agents.risk_analysis_agent import risk_analysis_agent
from app.agents.main_agent import main_agent

# Visualize the document agent
document_agent.get_graph().draw_mermaid_png(output_file_path="document_agent.png")

# Visualize the highlighting agent
highlighting_agent.get_graph().draw_mermaid_png(output_file_path="highlighting_agent.png")

# Visualize the QA agent
qa_agent.get_graph().draw_mermaid_png(output_file_path="qa_agent.png")

# Visualize the risk analysis agent
risk_analysis_agent.get_graph().draw_mermaid_png(output_file_path="risk_analysis_agent.png")

# Visualize the main agent
main_agent.get_graph(xray=1).draw_mermaid_png(output_file_path="main_agent.png")
