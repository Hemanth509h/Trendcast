import os
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# This is using Gemini API with a user-provided key
# Reference: python_gemini_ai_integrations integration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

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
    if not GEMINI_API_KEY:
        return "Gemini API key not configured. Please set GEMINI_API_KEY."
        
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
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return "Gemini API Quota Exceeded: Your API key has reached its usage limit. Please check your Google AI Studio billing/plan or wait for the quota to reset."
        return f"Error generating insights: {error_msg}"
