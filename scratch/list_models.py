import os
from google import genai
from dotenv import load_dotenv

def list_mods():
    load_dotenv("backend/.env")
    key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=key)
    try:
        print("Available models:")
        for m in client.models.list():
            print(f"- {m.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_mods()
