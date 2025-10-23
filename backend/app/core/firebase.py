import os
import firebase_admin
from firebase_admin import credentials, auth, storage, firestore
from dotenv import load_dotenv

load_dotenv()

# --- Robust Firebase Admin SDK Initialization ---
try:
    # The SDK will automatically find the credentials file if the
    # GOOGLE_APPLICATION_CREDENTIALS environment variable is set.
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")

    if not cred_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
    if not bucket_name:
        raise ValueError("FIREBASE_STORAGE_BUCKET environment variable not set.")

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': bucket_name
    })
    print("✅ --- Firebase Admin SDK initialized successfully. ---")

except Exception as e:
    # This will print a very clear error message if initialization fails.
    print(f"❌ --- CRITICAL ERROR: Firebase Admin SDK failed to initialize: {e} --- ❌")
    # You might want to exit the application if Firebase is essential
    # import sys
    # sys.exit(1)


def get_firebase_auth():
    return auth

def get_firebase_storage():
    return storage.bucket()

def get_firestore_client():
    return firestore.client()
