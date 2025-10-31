import os
import firebase_admin
from firebase_admin import credentials, auth, storage, firestore
from dotenv import load_dotenv

load_dotenv()

# --- Robust Firebase Admin SDK Initialization ---
try:
    # Construct credentials from environment variables
    creds_json = {
        "type": os.getenv("TYPE"),
        "project_id": os.getenv("PROJECT_ID"),
        "private_key_id": os.getenv("PRIVATE_KEY_ID"),
        "private_key": os.getenv("PRIVATE_KEY").replace('\\n', '\n'),
        "client_email": os.getenv("CLIENT_EMAIL"),
        "client_id": os.getenv("CLIENT_ID"),
        "auth_uri": os.getenv("AUTH_URI"),
        "token_uri": os.getenv("TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("AUTH_PROVIDER_X509_CERT_URL"),
        "client_x509_cert_url": os.getenv("CLIENT_X509_CERT_URL"),
        "universe_domain": os.getenv("UNIVERSE_DOMAIN"),
    }

    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket_name:
        raise ValueError("FIREBASE_STORAGE_BUCKET environment variable not set.")

    cred = credentials.Certificate(creds_json)
    firebase_admin.initialize_app(cred, {
        'storageBucket': bucket_name
    })
    print("--- Firebase Admin SDK initialized successfully from environment variables. ---")

except Exception as e:
    # This will print a very clear error message if initialization fails.
    print(f"--- CRITICAL ERROR: Firebase Admin SDK failed to initialize: {e} ---")
    # You might want to exit the application if Firebase is essential
    # import sys
    # sys.exit(1)


def get_firebase_auth():
    return auth

def get_firebase_storage():
    return storage.bucket()

def get_firestore_client():
    return firestore.client()
