from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import pandas as pd
from ..database import sales_collection, forecasts_collection
from ..utils.ai_helper import generate_sales_insights
from .auth import get_current_user_id
import json

router = APIRouter()

class InsightRequest(BaseModel):
    upload_id: str
    forecast_id: str

@router.post("/insights")
async def get_insights(req: InsightRequest, user_id: str = Depends(get_current_user_id)):
    """
    Generates AI insights for a specific forecast and its dataset.
    """
    from bson import ObjectId
    
    # 1. Fetch Forecast
    forecast = await forecasts_collection.find_one({
        "_id": ObjectId(req.forecast_id), 
        "user_id": user_id
    })
    
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    # 2. Fetch Dataset
    dataset = await sales_collection.find_one({
        "id": req.upload_id, 
        "user_id": user_id
    })
    
    if not dataset:
        # Try finding by upload_id if it's the custom string id
        dataset = await sales_collection.find_one({
            "upload_id": req.upload_id, 
            "user_id": user_id
        })
        
    if not dataset:
         raise HTTPException(status_code=404, detail="Dataset not found")

    # 3. Prepare Data for Prompt
    df = pd.DataFrame(dataset.get('records', []))
    if df.empty:
        raise HTTPException(status_code=400, detail="Empty dataset")

    # Ensure Date is datetime
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['Date'])
    
    # Get column name from forecast
    target_column = forecast.get('column', 'Weekly_Sales')
    
    # Forecast data
    forecast_data = forecast.get('forecast_data', {})
    predicted_values = forecast_data.get('forecast', [])
    forecast_dates = forecast_data.get('dates', [])
    metrics = forecast_data.get('metrics', {})
    
    # Create forecast summary for prompt (limit to 7 days to save tokens)
    forecast_summary = ""
    for i in range(min(7, len(predicted_values))):
        date_str = forecast_dates[i] if i < len(forecast_dates) else f"Day {i+1}"
        forecast_summary += f"{date_str}: {predicted_values[i]:.2f}\n"

    # Top products (if product column exists, otherwise generic)
    product_col = 'product' if 'product' in df.columns else (
        'Product' if 'Product' in df.columns else (
            'Store' if 'Store' in df.columns else None
        )
    )
    
    top_items = "N/A"
    if product_col:
        top_items = df.groupby(product_col)[target_column].sum().nlargest(5).to_string()

    # Monthly Trend (last 6 months)
    monthly_trend = df.resample('ME', on='Date')[target_column].sum().tail(6).to_string()

    # 4. Construct Prompt
    prompt = f"""
You are a sales forecasting analyst assistant.

I have already run a time series model on my sales dataset. 
Below is a structured summary of the data and forecast results.

=== DATA SUMMARY ===
- Date Range: {df['Date'].min().strftime('%Y-%m-%d')} to {df['Date'].max().strftime('%Y-%m-%d')}
- Total Records: {len(df)}
- Total Sales: {df[target_column].sum():,.2f}
- Average Daily Sales: {df[target_column].mean():,.2f}

=== TOP 5 ITEMS BY SALES ===
{top_items}

=== MONTHLY SALES TREND (last 6 months) ===
{monthly_trend}

=== FORECAST (next {len(predicted_values)} days) ===
{forecast_summary}

=== MODEL PERFORMANCE ===
- Model Used: {forecast.get('model', 'SARIMA')}
- MAE: {metrics.get('mae', 0):.2f}
- RMSE: {metrics.get('rmse', 0):.2f}
- Accuracy: {metrics.get('accuracy', 0):.2f}%

Based on the above, please:
1. Summarize the overall sales trend in simple language
2. Identify any anomalies or unusual patterns
3. Explain what the forecast suggests for the next 30 days
4. Give 3 actionable business recommendations
5. Flag any risks or concerns in the forecast
"""

    # 5. Generate Insights
    insights = await generate_sales_insights(prompt)
    
    return {"insights": insights}
