import os
import json
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX

router = APIRouter()

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data.json")

class ForecastRequest(BaseModel):
    column: str = "Weekly_Sales"
    horizon: int = 30
    model: str = "sarima"
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

        # parse dates using day-first interpretation to avoid warnings on ambiguous formats
        df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
        
        df = df.dropna(subset=['Date', column])
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid data found in selected column")
            
        df = df.sort_values('Date').reset_index(drop=True)
        
        # Aggregate to daily to ensure regular time series
        series = df.groupby('Date')[column].sum().resample('D').sum().fillna(0)
        
        if len(series) < 2:
            raise HTTPException(status_code=400, detail="Not enough data points for time series forecasting")

        # helper for forecasting a single time series, returns tuple
        def forecast_series(series_obj, horizon_val):
            # farcast and fitted values using same logic as before
            try:
                if len(series_obj) > 14:
                    mdl = SARIMAX(series_obj, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7), 
                                  enforce_stationarity=False, enforce_invertibility=False)
                else:
                    mdl = SARIMAX(series_obj, order=(1, 1, 1), enforce_stationarity=False, 
                                  enforce_invertibility=False)
                mdl_fit = mdl.fit(disp=False)
                fcst = mdl_fit.get_forecast(steps=horizon_val).predicted_mean
                hist_pred = mdl_fit.fittedvalues
            except Exception:
                # fallback
                from statsmodels.tsa.holtwinters import ExponentialSmoothing
                mdl = ExponentialSmoothing(series_obj, trend='add', seasonal='add', seasonal_periods=7)
                mdl_fit = mdl.fit()
                fcst = mdl_fit.forecast(horizon_val)
                hist_pred = mdl_fit.fittedvalues
            return fcst, hist_pred

        def compute_metrics(series_obj, hist_pred):
            m = mean_absolute_error(series_obj, hist_pred)
            mse_val = mean_squared_error(series_obj, hist_pred)
            r2_val = r2_score(series_obj, hist_pred)
            return {
                "mae": float(m),
                "mse": float(mse_val),
                "r2": float(r2_val),
                "rmse": float(np.sqrt(mse_val)),
                "accuracy": float(max(0, min(100, r2_val * 100)))
            }

        # SARIMA forecast for entire dataset (used for metrics and default behavior)
        full_forecast, full_hist_pred = forecast_series(series, horizon)
        mae = mean_absolute_error(series, full_hist_pred)
        mse = mean_squared_error(series, full_hist_pred)
        r2 = r2_score(series, full_hist_pred)

        response_payload = {
            "forecast": [max(0, float(v)) for v in full_forecast.tolist()],
            "dates": [d.strftime('%Y-%m-%d') for d in pd.date_range(start=series.index[-1] + pd.Timedelta(days=1), periods=horizon, freq='D')],
            "historical": {
                "dates": series.index.strftime('%Y-%m-%d').tolist(),
                "values": series.values.tolist(),
                "trend": full_hist_pred.tolist()
            },
            "metrics": {
                "mae": float(mae),
                "mse": float(mse),
                "r2": float(r2),
                "rmse": float(np.sqrt(mse)),
                "accuracy": float(max(0, min(100, r2 * 100)))
            },
            "is_grouped": False  # default flag
        }

        # handle grouping if requested
        if req.group_by and req.group_by in df.columns:
            groups_dict = {}
            for grp_val, grp_df in df.groupby(req.group_by):
                # prepare subgroup series
                sg = grp_df.copy()
                sg = sg.dropna(subset=['Date', column])
                if sg.empty:
                    continue
                sg = sg.sort_values('Date')
                subseries = sg.groupby('Date')[column].sum().resample('D').sum().fillna(0)
                if len(subseries) < 2:
                    continue
                grp_fcst, grp_hist_pred = forecast_series(subseries, horizon)
                groups_dict[str(grp_val)] = {
                    "historical": subseries.values.tolist(),
                    "forecast": [max(0, float(v)) for v in grp_fcst.tolist()],
                    "dates": subseries.index.strftime('%Y-%m-%d').tolist()
                }

            # attach grouping info to response
            response_payload["is_grouped"] = True
            response_payload["groups"] = groups_dict

        return response_payload
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
