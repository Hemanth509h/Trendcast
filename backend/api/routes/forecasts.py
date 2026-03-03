import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
from supabase import create_client, Client
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ==========================
# SUPABASE CONFIG
# ==========================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://coztxkaoyxphgvoulbel.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenR4a2FveXhwaGd2b3VsYmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI3MTEsImV4cCI6MjA4Nzc2ODcxMX0.Pa8rf_fFIAaIj0wiDGLoi11qP9mRqJl8YP7Qbt3ojkU")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ==========================
# REQUEST MODEL
# ==========================
class ForecastRequest(BaseModel):
    column: str = "Weekly_Sales"
    horizon: int = 30
    model: str = "sarima"
    group_by: str | None = None


# ==========================
# HELPER: GET USER ID FROM REQUEST
# ==========================
def get_user_id_from_request(request: Request) -> str:
    """Extract and verify user_id from request token"""
    token = getattr(request.state, "token", None)
    if not token:
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ==========================
# FORECAST API
# ==========================
@router.post("/generateforecast")
async def generate_forecast(req: ForecastRequest, request: Request):
    try:
        # Get authenticated user
        try:
            user_id = get_user_id_from_request(request)
            response = (
                supabase.table("sales_data")
                .select("*")
                .eq("user_id", user_id)  # Filter by user
                .order("id", desc=True)
                .limit(1)
                .execute()
            )
        except:
            # Fallback: get latest data without user filter
            response = (
                supabase.table("sales_data")
                .select("*")
                .order("id", desc=True)
                .limit(1)
                .execute()
            )
        
        column = req.column
        horizon = req.horizon

        if not response.data:
            raise HTTPException(status_code=400, detail="No data available in Supabase")

        dataset = response.data[0]
        df = pd.DataFrame(dataset.get("data", []))

        if df.empty or "Date" not in df.columns or column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for forecasting"
            )

        # ==========================
        # PREPROCESSING
        # ==========================
        df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
        df = df.dropna(subset=["Date", column])

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="No valid data found in selected column"
            )

        df = df.sort_values("Date").reset_index(drop=True)

        # Aggregate daily
        series = (
            df.groupby("Date")[column]
            .sum()
            .resample("D")
            .sum()
            .fillna(0)
        )

        if len(series) < 2:
            raise HTTPException(
                status_code=400,
                detail="Not enough data points for forecasting"
            )

        # ==========================
        # FORECAST FUNCTION
        # ==========================
        def forecast_series(series_obj, horizon_val):
            try:
                if len(series_obj) > 14:
                    model = SARIMAX(
                        series_obj,
                        order=(1, 1, 1),
                        seasonal_order=(1, 1, 1, 7),
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                    )
                else:
                    model = SARIMAX(
                        series_obj,
                        order=(1, 1, 1),
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                    )

                model_fit = model.fit(disp=False)
                forecast = model_fit.get_forecast(steps=horizon_val).predicted_mean
                fitted = model_fit.fittedvalues

            except Exception:
                from statsmodels.tsa.holtwinters import ExponentialSmoothing

                model = ExponentialSmoothing(
                    series_obj,
                    trend="add",
                    seasonal="add",
                    seasonal_periods=7,
                )
                model_fit = model.fit()
                forecast = model_fit.forecast(horizon_val)
                fitted = model_fit.fittedvalues

            return forecast, fitted

        # ==========================
        # METRICS FUNCTION
        # ==========================
        def compute_metrics(actual, predicted):
            mae = mean_absolute_error(actual, predicted)
            mse = mean_squared_error(actual, predicted)
            r2 = r2_score(actual, predicted)

            return {
                "mae": float(mae),
                "mse": float(mse),
                "r2": float(r2),
                "rmse": float(np.sqrt(mse)),
                "accuracy": float(max(0, min(100, r2 * 100))),
            }

        # ==========================
        # MAIN FORECAST
        # ==========================
        forecast_values, historical_pred = forecast_series(series, horizon)
        metrics = compute_metrics(series, historical_pred)

        response_payload = {
            "forecast": [max(0, float(v)) for v in forecast_values.tolist()],
            "dates": [
                d.strftime("%Y-%m-%d")
                for d in pd.date_range(
                    start=series.index[-1] + pd.Timedelta(days=1),
                    periods=horizon,
                    freq="D",
                )
            ],
            "historical": {
                "dates": series.index.strftime("%Y-%m-%d").tolist(),
                "values": series.values.tolist(),
                "trend": historical_pred.tolist(),
            },
            "metrics": metrics,
            "is_grouped": False,
        }

        # ==========================
        # GROUPING SUPPORT
        # ==========================
        if req.group_by and req.group_by in df.columns:
            groups_dict = {}

            for group_value, group_df in df.groupby(req.group_by):
                group_df = group_df.dropna(subset=["Date", column])
                if group_df.empty:
                    continue

                sub_series = (
                    group_df.groupby("Date")[column]
                    .sum()
                    .resample("D")
                    .sum()
                    .fillna(0)
                )

                if len(sub_series) < 2:
                    continue

                group_forecast, group_pred = forecast_series(sub_series, horizon)

                groups_dict[str(group_value)] = {
                    "historical": sub_series.values.tolist(),
                    "forecast": [
                        max(0, float(v)) for v in group_forecast.tolist()
                    ],
                    "dates": sub_series.index.strftime("%Y-%m-%d").tolist(),
                }

            response_payload["is_grouped"] = True
            response_payload["groups"] = groups_dict

        # ==========================
        # SAVE FORECAST TO DATABASE
        # ==========================
        forecast_record = {
            "user_id": user_id,
            "column": column,
            "horizon": horizon,
            "model": req.model,
            "forecast_data": response_payload,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        try:
            supabase.table("forecasts").insert(forecast_record).execute()
        except Exception as db_err:
            # Log but don't fail the forecast if saving to DB fails
            print(f"Warning: Could not save forecast to database: {db_err}")

        return response_payload

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ==========================
# GET USER FORECASTS
# ==========================
@router.get("/forecasts")
async def get_user_forecasts(request: Request):
    try:
        user_id = get_user_id_from_request(request)
        
        response = (
            supabase.table("forecasts")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return {"forecasts": response.data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================
# GET SINGLE FORECAST
# ==========================
@router.get("/forecasts/{forecast_id}")
async def get_forecast(forecast_id: str, request: Request):
    try:
        user_id = get_user_id_from_request(request)
        
        response = (
            supabase.table("forecasts")
            .select("*")
            .eq("id", forecast_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Forecast not found")
        
        return {"forecast": response.data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================
# DELETE FORECAST
# ==========================
@router.delete("/forecasts/{forecast_id}")
async def delete_forecast(forecast_id: str, request: Request):
    try:
        user_id = get_user_id_from_request(request)
        
        # Verify ownership before deleting
        forecast = (
            supabase.table("forecasts")
            .select("user_id")
            .eq("id", forecast_id)
            .single()
            .execute()
        )
        
        if not forecast.data or forecast.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this forecast")
        
        supabase.table("forecasts").delete().eq("id", forecast_id).execute()
        
        return {"message": "Forecast deleted successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))