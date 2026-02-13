import os
import json
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

router = APIRouter()

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data.json")

class ForecastRequest(BaseModel):
    column: str = "Sales"
    horizon: int = 30
    model: str = "timeseries"

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

        df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
        if df['Date'].isna().any():
             df.loc[df['Date'].isna(), 'Date'] = pd.to_datetime(df[df['Date'].isna()]['Date'], errors='coerce')
        
        df = df.dropna(subset=['Date'])
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid dates found in data")
            
        df = df.sort_values('Date').reset_index(drop=True)
        daily_data = df.groupby('Date')[column].sum().reset_index()
        daily_data = daily_data.sort_values('Date').reset_index(drop=True)
        
        daily_data['DayOfWeek'] = daily_data['Date'].dt.dayofweek
        daily_data['Month'] = daily_data['Date'].dt.month
        
        values = daily_data[column].values
        X = np.arange(len(values)).reshape(-1, 1)
        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X)
        
        train_size = int(len(values) * 0.8)
        if train_size == 0: train_size = len(values)
        
        X_train = X_poly[:train_size]
        y_train = values[:train_size]
        
        ridge = Ridge(alpha=1.0)
        ridge.fit(X_train, y_train)
        trend = ridge.predict(X_poly)
        
        dow_factors = daily_data.groupby('DayOfWeek')[column].mean() / (daily_data[column].mean() or 1.0)
        month_factors = daily_data.groupby('Month')[column].mean() / (daily_data[column].mean() or 1.0)
        
        last_date = daily_data['Date'].max()
        future_dates_dt = [last_date + pd.Timedelta(days=i) for i in range(1, horizon + 1)]
        
        forecast_results = []
        lower_bounds = []
        upper_bounds = []
        
        all_predictions = ridge.predict(X_poly)
        residuals = values - all_predictions
        std_error = np.std(residuals) if len(residuals) > 0 else (values.std() or 1.0)
        
        for i, f_date in enumerate(future_dates_dt):
            future_x = np.array([[len(values) + i]])
            future_x_poly = poly.transform(future_x)
            trend_pred = ridge.predict(future_x_poly)[0]
            
            dow_factor = dow_factors.get(f_date.dayofweek, 1.0)
            month_factor = month_factors.get(f_date.month, 1.0)
            
            final_prediction = trend_pred * dow_factor * month_factor
            
            z_score = 1.96
            lower = max(0, final_prediction - (z_score * std_error))
            upper = final_prediction + (z_score * std_error)
            
            forecast_results.append(max(0, float(final_prediction)))
            lower_bounds.append(float(lower))
            upper_bounds.append(float(upper))
        
        mae = mean_absolute_error(values, all_predictions)
        mse = mean_squared_error(values, all_predictions)
        r2 = r2_score(values, all_predictions)

        return {
            "forecast": forecast_results,
            "dates": [d.strftime('%Y-%m-%d') for d in future_dates_dt],
            "historical": {
                "dates": daily_data['Date'].dt.strftime('%Y-%m-%d').tolist(),
                "values": daily_data[column].tolist(),
                "trend": trend.tolist()
            },
            "confidence_bounds": {"lower": lower_bounds, "upper": upper_bounds},
            "metrics": {
                "mae": float(mae),
                "mse": float(mse),
                "r2": float(r2),
                "rmse": float(np.sqrt(mse))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
