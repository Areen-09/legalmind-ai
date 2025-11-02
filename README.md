# LegalMind AI

[](https://opensource.org/licenses/MIT)

AI-Powered Legal Document Analysis. Built with Google Gemini 2.5 Flash and Firebase.

LegalMind AI is an intelligent platform that demystifies complex legal and financial documents. Users can upload contracts, NDAs, or agreements and receive an instant, comprehensive analysis powered by cutting-edge AI. Our goal is to make legal documents understandable for everyone.

## 🌟 Key Features

  * 🤖 *Advanced AI Analysis:* Powered by *Google Gemini 2.5 Flash* for lightning-fast document classification, risk scoring, and content analysis.
  * 📄 *Multi-Format Support:* Analyze PDF, DOCX, and TXT documents.
  * ⚠ *Risk Assessment:* Get an AI-powered risk score (1-100) to quickly identify problematic documents.
  * 💡 *Plain English Explanations:* Complex legal clauses are translated into simple, understandable language.
  * 💬 *Interactive Q\&A:* Ask specific questions about your document (e.g., "What is the termination clause?") and get conversational answers.
  * ☁ *Secure Cloud Integration:* Built entirely on Google Cloud services, using *Firebase* for secure authentication, *Cloud Storage* for file handling, and *Cloud Firestore* for storing results.

## 🛠 Tech Stack

  * *Frontend:* Next.js 15 (React 19), TypeScript, Tailwind CSS, shadcn/ui
  * *Backend:* FastAPI (Python), LangGraph (Multi-Agent System), Pinecone (Vector DB)
  * *Google Cloud:*
      * *Gemini 2.5 Flash* (AI Model)
      * *Gemini Embeddings* (Vectorization)
      * *Firebase Authentication* (Google Sign-In)
      * *Cloud Firestore* (Real-time NoSQL Database)
      * *Cloud Storage* (File Storage)
      * *Google Cloud Run* (Backend Deployment)

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

  * Python 3.12+
  * Node.js 18+
  * A Google Cloud Project with Gemini API enabled
  * A Firebase Project
  * A Pinecone Account

### 1\. Configure Environment

You will need to create .env files for both the backend and frontend.

**backend/.env:**

sh
GOOGLE_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
# ... (Add your Firebase Service Account credentials)
FIREBASE_STORAGE_BUCKET=your-project.appspot.com


**frontend/.env.local:**

sh
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# ... (Add other Firebase web config values)
NEXT_PUBLIC_API_BASE=http://localhost:8000


### 2\. Run Backend

sh
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload
# Backend will run on http://localhost:8000


### 3\. Run Frontend

sh
cd frontend
npm install
npm run dev
# Frontend will run on http://localhost:3000


## 🤝 Contributing

Contributions are welcome\! Please fork the repository and open a pull request.

1.  Fork the Project
2.  Create your Feature Branch (git checkout -b feature/AmazingFeature)
3.  Commit your Changes (git commit -m 'Add some AmazingFeature')
4.  Push to the Branch (git push origin feature/AmazingFeature)
5.  Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 👥 Authors

  * *Areen* - Initial Work - [areen-09](https://www.google.com/search?q=https://github.com/areen-09)

## 🙏 Acknowledgments

  * Google Cloud for Gemini and Firebase
  * LangChain & LangGraph
  * shadcn/ui
  * Pinecone
