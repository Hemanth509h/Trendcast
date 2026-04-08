import os
import pandas as pd
import io
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Request
from dotenv import load_dotenv
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime
from ..database import sales_collection

load_dotenv()

router = APIRouter()

# ==========================
# AUTH CONFIG
# ==========================
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ==========================
# REQUEST MODELS
# ==========================
class SalesRecord(BaseModel):
    data: dict

class UpdateRecordRequest(BaseModel):
    record_id: str
    updates: dict

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
# UPLOAD FILE
# ==========================
@router.post("/sales/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload CSV/Excel file for sales forecasting"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    user_id = await get_user_id_from_request(request)
    
    try:
        contents = await file.read()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="File must be CSV or Excel format")

        # Validate data
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")

        import json
        # Convert via JSON to natively handle numpy types (int64) and NaNs which PyMongo cannot serialize
        data = json.loads(df.to_json(orient="records"))
        
        # Create upload record
        upload_id = str(uuid.uuid4())
        sales_data = {
            "id": upload_id,
            "user_id": user_id,
            "filename": file.filename,
            "records": data,
            "record_count": len(data),
            "columns": list(df.columns),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await sales_collection.insert_one(sales_data)
        
        return {
            "id": upload_id,
            "filename": file.filename,
            "record_count": len(data),
            "columns": list(df.columns),
            "message": "File uploaded successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ==========================
# GET ALL UPLOADS FOR USER
# ==========================
@router.get("/sales")
async def get_all_sales(request: Request):
    """Get all sales uploads for authenticated user"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        uploads = await sales_collection.find({"user_id": user_id}).to_list(None)
        
        for upload in uploads:
            upload["_id"] = str(upload["_id"])
        
        return {
            "uploads": uploads,
            "count": len(uploads)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales data: {str(e)}")

# ==========================
# GET SPECIFIC UPLOAD
# ==========================
@router.get("/sales/{upload_id}")
async def get_specific_upload(upload_id: str, request: Request):
    """Get specific sales upload"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        upload = await sales_collection.find_one({
            "id": upload_id,
            "user_id": user_id
        })
        
        if not upload:
            raise HTTPException(status_code=404, detail="Sales data not found")
        
        upload["_id"] = str(upload["_id"])
        return upload
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

# ==========================
# DELETE UPLOAD
# ==========================
@router.delete("/sales/{upload_id}")
async def delete_upload(upload_id: str, request: Request):
    """Delete specific sales upload"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        result = await sales_collection.delete_one({
            "id": upload_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Sales data not found")
        
        return {"message": "Sales data deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting data: {str(e)}")

# ==========================
# ADD RECORD TO UPLOAD
# ==========================
@router.post("/sales/{upload_id}/records")
async def add_record(upload_id: str, record: SalesRecord, request: Request):
    """Add a new record to existing sales upload"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        upload = await sales_collection.find_one({
            "id": upload_id,
            "user_id": user_id
        })
        
        if not upload:
            raise HTTPException(status_code=404, detail="Sales data not found")
        
        # Add new record
        new_records = upload["records"] + [record.data]
        
        await sales_collection.update_one(
            {"id": upload_id},
            {"$set": {
                "records": new_records,
                "record_count": len(new_records),
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
        
        return {"message": "Record added successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding record: {str(e)}")

# ==========================
# DELETE RECORD FROM UPLOAD
# ==========================
@router.delete("/sales/{upload_id}/records/{record_index}")
async def delete_record(upload_id: str, record_index: int, request: Request):
    """Delete a specific record from upload"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        upload = await sales_collection.find_one({
            "id": upload_id,
            "user_id": user_id
        })
        
        if not upload:
            raise HTTPException(status_code=404, detail="Sales data not found")
        
        if record_index < 0 or record_index >= len(upload["records"]):
            raise HTTPException(status_code=400, detail="Invalid record index")
        
        # Remove record
        updated_records = upload["records"][:record_index] + upload["records"][record_index+1:]
        
        await sales_collection.update_one(
            {"id": upload_id},
            {"$set": {
                "records": updated_records,
                "record_count": len(updated_records),
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
        
        return {"message": "Record deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting record: {str(e)}")

# ==========================
# EXPORT UPLOAD
# ==========================
@router.get("/sales/{upload_id}/export")
async def export_sales(upload_id: str, request: Request):
    """Export sales data as CSV"""
    
    user_id = await get_user_id_from_request(request)
    
    try:
        upload = await sales_collection.find_one({
            "id": upload_id,
            "user_id": user_id
        })
        
        if not upload:
            raise HTTPException(status_code=404, detail="Sales data not found")
        
        df = pd.DataFrame(upload["records"])
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={upload['filename']}"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")