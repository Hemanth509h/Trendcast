import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
from datetime import datetime
import os
from dotenv import load_dotenv
from jose import JWTError, jwt
from ..database import sales_collection, forecasts_collection

load_dotenv()

router = APIRouter()

# ==========================
# AUTH CONFIG
# ==========================
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ==========================
# REQUEST MODEL
# ==========================
class ForecastRequest(BaseModel):
    upload_id: str
    column: str = "Weekly_Sales"
    horizon: int = 30
    model: str = "sarima"
    group_by: str | None = None

# ==========================
# HELPER: GET USER ID FROM REQUEST
# ==========================
async def get_user_id_from_request(request: Request) -> str:
    """Extract and verify user_id from request token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ==========================
# FORECAST API
# ==========================
@router.post("/forecasts/generate")
async def generate_forecast(req: ForecastRequest, request: Request):
    try:
        user_id = await get_user_id_from_request(request)
        
        from bson import ObjectId
        query = {"user_id": user_id}
        or_conds = [{"id": req.upload_id}]
        try:
            or_conds.append({"_id": ObjectId(req.upload_id)})
        except Exception:
            pass
        query["$or"] = or_conds
        
        dataset = await sales_collection.find_one(query)

        if not dataset:
            raise HTTPException(status_code=400, detail="No data available")

        column = req.column
        horizon = req.horizon

        df = pd.DataFrame(dataset.get('records', []))
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
            actual = np.array(series_obj)
            pred = np.array(hist_pred)
            valid = ~np.isnan(pred) & ~np.isnan(actual)
            actual = actual[valid]
            pred = pred[valid]
            if len(actual) == 0:
                return {
                    "mae": 0.0,
                    "mse": 0.0,
                    "r2": 0.0,
                    "rmse": 0.0,
                    "accuracy": 0.0
                }
            mae_val = mean_absolute_error(actual, pred)
            mse_val = mean_squared_error(actual, pred)
            r2_val = r2_score(actual, pred)
            rmse_val = np.sqrt(mse_val)
            mask = actual != 0
            if np.any(mask):
                mape = np.mean(np.abs((actual[mask] - pred[mask]) / actual[mask]))
                accuracy = max(0, min(100, (1 - mape) * 100))
            else:
                accuracy = 0.0
            return {
                "mae": float(mae_val),
                "mse": float(mse_val),
                "r2": float(r2_val),
                "rmse": float(rmse_val),
                "accuracy": float(accuracy)
            }

        full_forecast, full_hist_pred = forecast_series(series, horizon)
        metrics_dict = compute_metrics(series, full_hist_pred)

        response_payload = {
            "forecast": [max(0, float(v)) for v in full_forecast.tolist()],
            "dates": [d.strftime('%Y-%m-%d') for d in pd.date_range(start=series.index[-1] + pd.Timedelta(days=1), periods=horizon, freq='D')],
            "historical": {
                "dates": series.index.strftime('%Y-%m-%d').tolist(),
                "values": series.values.tolist(),
                "trend": full_hist_pred.tolist()
            },
            "metrics": metrics_dict,
            "is_grouped": False
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

        # SAVE FORECAST TO DATABASE
        forecast_record = {
            "user_id": user_id,
            "upload_id": req.upload_id,
            "column": column,
            "horizon": horizon,
            "model": req.model,
            "forecast_data": response_payload,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = await forecasts_collection.insert_one(forecast_record)
        
        # Include the ID in the response so frontend can use it (e.g., for AI insights)
        response_payload["id"] = str(result.inserted_id)

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
        user_id = await get_user_id_from_request(request)
        cursor = forecasts_collection.find({"user_id": user_id}).sort("created_at", -1)
        forecasts = await cursor.to_list(length=100)
        
        for f in forecasts:
            f["_id"] = str(f["_id"])
            
        return {"forecasts": forecasts}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================
# GET SINGLE FORECAST
# ==========================
@router.get("/forecasts/{forecast_id}")
async def get_forecast(forecast_id: str, request: Request):
    try:
        from bson import ObjectId
        user_id = await get_user_id_from_request(request)
        
        forecast = await forecasts_collection.find_one({"_id": ObjectId(forecast_id), "user_id": user_id})
        
        if not forecast:
            raise HTTPException(status_code=404, detail="Forecast not found")
        
        forecast["_id"] = str(forecast["_id"])
        return {"forecast": forecast}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================
# DELETE FORECAST
# ==========================
@router.delete("/forecasts/{forecast_id}")
async def delete_forecast(forecast_id: str, request: Request):
    try:
        from bson import ObjectId
        user_id = await get_user_id_from_request(request)
        
        await forecasts_collection.delete_one({"_id": ObjectId(forecast_id), "user_id": user_id})
        return {"message": "Forecast deleted successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))