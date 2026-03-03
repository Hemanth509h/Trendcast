import os
import pandas as pd
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from supabase import create_client, Client

router = APIRouter()

# Supabase Credentials
SUPABASE_URL = "https://coztxkaoyxphgvoulbel.supabase.co"
SUPABASE_KEY = "sb_publishable_9gj0hwRnm6zbte_e_gH04w_GjPJ8lTi"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ================== UPLOAD ==================
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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

    response = supabase.table("sales_data").insert({
        "data": data,
        "filename": file.filename,
        "record_count": len(data)
    }).execute()

    if response.data is None:
        raise HTTPException(status_code=500, detail="Insert failed")

    return {"message": "File uploaded to Supabase successfully"}


# ================== GET SALES DATA ==================
@router.get("/salesdata")
async def get_sales_data():
    response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    return response.data[0]


# ================== DELETE ALL ==================
@router.get("/delete")
async def delete_data():
    response = supabase.table("sales_data").delete().neq("id", 0).execute()

    return {"message": "Deleted successfully", "type": "success"}


# ================== ADD RECORD ==================
@router.post("/addrecord")
async def add_record(record: dict):
    # Get latest dataset
    response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="No data found")

    latest = response.data[0]
    updated_data = latest["data"]
    updated_data.append(record)

    # Update record
    supabase.table("sales_data").update({
        "data": updated_data,
        "record_count": len(updated_data)
    }).eq("id", latest["id"]).execute()

    return {"message": "Record added successfully"}


# ================== DELETE RECORD ==================
@router.post("/deleterecord")
async def delete_record(request_data: dict):
    record_to_delete = request_data.get("record")

    response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()

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
async def export_data():
    response = supabase.table("sales_data").select("*").order("id", desc=True).limit(1).execute()

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