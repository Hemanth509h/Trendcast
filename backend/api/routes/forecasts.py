import os
import json
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.holtwinters import ExponentialSmoothing

router = APIRouter()

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data.json")

class ForecastRequest(BaseModel):
    column: str = "Weekly_Sales"
    horizon: int = 30
    model: str = "timeseries"
    group_by: str | None = None

@router.post("/generateforecast")
async def generate_forecast(req: ForecastRequest):
    try:
        column = req.column
        horizon = req.horizon

        if not os.path.exists(DATA_FILE):
            raise HTTPException(status_code=400, detail="No data available")

        with open(DATA_FILE, "r") as f:
            dataset = json.load(f)
        
        df = pd.DataFrame(dataset.get('data', []))
        if df.empty or 'Date' not in df.columns or column not in df.columns:
            raise HTTPException(status_code=400, detail="Insufficient data for forecasting")

        df['Date'] = pd.to_datetime(df['Date'], dayfirst=False, errors='coerce')
        if df['Date'].isna().any():
             df.loc[df['Date'].isna(), 'Date'] = pd.to_datetime(df[df['Date'].isna()]['Date'], dayfirst=True, errors='coerce')
        
        df = df.dropna(subset=['Date', column])
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid data found in selected column")
            
        df = df.sort_values('Date').reset_index(drop=True)
        
        # Aggregate to daily to ensure regular time series
        series = df.groupby('Date')[column].sum().resample('D').sum().fillna(0)
        
        if len(series) < 2:
            raise HTTPException(status_code=400, detail="Not enough data points for time series forecasting")

        # Holt-Winters Exponential Smoothing
        # For small datasets, we use simpler models
        if len(series) < 14:
            model = ExponentialSmoothing(series, trend='add', seasonal=None, initialization_method="estimated")
        else:
            # Weekly seasonality (7 days)
            model = ExponentialSmoothing(series, trend='add', seasonal='add', seasonal_periods=7, initialization_method="estimated")
        
        model_fit = model.fit()
        forecast = model_fit.forecast(horizon)
        
        # Historical fitted values for trend line and metrics
        historical_pred = model_fit.fittedvalues
        
        mae = mean_absolute_error(series, historical_pred)
        mse = mean_squared_error(series, historical_pred)
        r2 = r2_score(series, historical_pred)

        return {
            "forecast": [max(0, float(v)) for v in forecast.tolist()],
            "dates": [d.strftime('%Y-%m-%d') for d in pd.date_range(start=series.index[-1] + pd.Timedelta(days=1), periods=horizon, freq='D')],
            "historical": {
                "dates": series.index.strftime('%Y-%m-%d').tolist(),
                "values": series.values.tolist(),
                "trend": historical_pred.tolist()
            },
            "metrics": {
                "mae": float(mae),
                "mse": float(mse),
                "r2": float(r2),
                "rmse": float(np.sqrt(mse)),
                "accuracy": float(max(0, min(100, r2 * 100)))
            }
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
