import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def generate_sales_insights(prompt_text: str):
    """
    Calls Google Gemini AI to generate insights based on the provided prompt.
    """
    if not GEMINI_API_KEY:
        return "AI Insights are currently unavailable because the Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file."

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt_text
        )
        return response.text
    except Exception as e:
        print(f"ERROR in generate_sales_insights: {str(e)}")
        return f"Error generating AI insights: {str(e)}"
