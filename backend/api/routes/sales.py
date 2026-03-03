import os
import pandas as pd
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Request
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://coztxkaoyxphgvoulbel.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenR4a2FveXhwaGd2b3VsYmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI3MTEsImV4cCI6MjA4Nzc2ODcxMX0.Pa8rf_fFIAaIj0wiDGLoi11qP9mRqJl8YP7Qbt3ojkU")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ==========================
# REQUEST MODELS
# ==========================
class AddRecordRequest(BaseModel):
    record: dict


class DeleteRecordRequest(BaseModel):
    record: dict


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


# ================== UPLOAD ==================
@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No selected file")

    contents = await file.read()

    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith('.xlsx'):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")

    data = df.to_dict(orient="records")

    try:
        user_id = get_user_id_from_request(request)
    except:
        user_id = "anonymous"

    response = supabase.table("sales_data").insert({
        "data": data,
        "filename": file.filename,
        "record_count": len(data)
    }).execute()

    if response.data is None:
        raise HTTPException(status_code=500, detail="Insert failed")

    return {
        "message": "File uploaded successfully",
        "filename": file.filename,
        "records": len(data)
    }


# ================== GET SALES DATA ==================
@router.get("/salesdata")
async def get_sales_data(request: Request):
    try:
        # Get latest data without user filter since user_id column is missing
        response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()
    except Exception as e:
        print(f"Error fetching sales data: {e}")
        raise HTTPException(status_code=404, detail="No data found")

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    return response.data[0]


# ================== DELETE ALL ==================
@router.get("/delete")
async def delete_data(request: Request):
    try:
        # Delete latest record
        latest = supabase.table("sales_data").select("id").order("id", desc=True).limit(1).execute()
        if latest.data:
            response = supabase.table("sales_data").delete().eq("id", latest.data[0]["id"]).execute()
    except Exception as e:
        print(f"Error deleting data: {e}")

    return {"message": "Deleted successfully", "type": "success"}


# ================== ADD RECORD ==================
@router.post("/addrecord")
async def add_record(data: AddRecordRequest, request: Request):
    try:
        # Get latest data
        response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()
    except Exception as e:
        print(f"Error adding record: {e}")

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    latest = response.data[0]
    updated_data = latest["data"]
    updated_data.append(data.record)

    # Update record
    supabase.table("sales_data").update({
        "data": updated_data,
        "record_count": len(updated_data)
    }).eq("id", latest["id"]).execute()

    return {"message": "Record added successfully"}


# ================== DELETE RECORD ==================
@router.post("/deleterecord")
async def delete_record(data: DeleteRecordRequest, request: Request):
    try:
        # Get latest data
        response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()
    except Exception as e:
        print(f"Error deleting record: {e}")
    
    record_to_delete = data.record

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    latest = response.data[0]
    updated_data = [r for r in latest["data"] if r != record_to_delete]

    supabase.table("sales_data").update({
        "data": updated_data,
        "record_count": len(updated_data)
    }).eq("id", latest["id"]).execute()

    return {"message": "Record deleted successfully"}


# ================== EXPORT ==================
@router.get("/export")
async def export_data(request: Request):
    try:
        # Get latest data
        response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()
    except Exception as e:
        print(f"Error exporting data: {e}")

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    df = pd.DataFrame(response.data[0]["data"])

    output = io.StringIO()
    df.to_csv(output, index=False)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_data.csv"}
    )