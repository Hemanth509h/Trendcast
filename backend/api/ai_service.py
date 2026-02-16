import os
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# This is using Replit's AI Integrations service for Gemini access.
# It does not require your own API key and charges are billed to your credits.
AI_INTEGRATIONS_GEMINI_API_KEY = os.environ.get("AI_INTEGRATIONS_GEMINI_API_KEY")
AI_INTEGRATIONS_GEMINI_BASE_URL = os.environ.get("AI_INTEGRATIONS_GEMINI_BASE_URL")

client = genai.Client(
    api_key=AI_INTEGRATIONS_GEMINI_API_KEY,
    http_options={
        'api_version': '',
        'base_url': AI_INTEGRATIONS_GEMINI_BASE_URL   
    }
)

def is_rate_limit_error(exception: BaseException) -> bool:
    """Check if the exception is a rate limit or quota violation error."""
    error_msg = str(exception).lower()
    return "429" in error_msg or "rate limit" in error_msg or "quota" in error_msg

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    retry=retry_if_exception(is_rate_limit_error),
    reraise=True
)
def get_ai_forecast(data_summary: str) -> str:
    """Generate a sales forecast and insights using Gemini."""
    prompt = f"""
    As a professional sales data analyst, provide a comprehensive business intelligence report based on this dataset summary:
    
    {data_summary}
    
    Structure your response with the following sections:
    1. Key Performance Indicators (KPI) Analysis
    2. Growth Trends & Seasonal Patterns
    3. Predictive Risk Assessment
    4. Strategic Recommendations for Revenue Optimization
    
    Keep the tone professional and the insights data-driven.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=2048)
        )
        return response.text or "No insights generated."
    except Exception as e:
        error_msg = str(e)
        if "FREE_CLOUD_BUDGET_EXCEEDED" in error_msg:
             return "Free cloud budget for AI integrations exceeded. Please upgrade your plan."
        return f"Error generating insights: {error_msg}"
