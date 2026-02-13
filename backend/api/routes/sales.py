import os
import json
import pandas as pd
import io
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Response

router = APIRouter()

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data.json")

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
        raise HTTPException(status_code=400, detail="Invalid file type. Use CSV or Excel.")
    
    data = df.to_dict(orient='records')
    with open(DATA_FILE, 'w') as f:
        json.dump({"data": data,
                   "filename": file.filename,
                    "record_count": len(data)}, f)
    return {"message": "File uploaded and data stored successfully" }

@router.get("/salesdata")
async def get_sales_data():
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=404, detail="Data file not found")
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    return data

@router.get("/delete")
async def delete_data():
    try:
        with open(DATA_FILE, "w") as f:
            json.dump({"data": []}, f, indent=4)
        return {"message": "Deleted successfully", "type": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/addrecord")
async def add_record(record: dict):
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=404, detail="Data file not found")
    
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    
    if 'data' not in data:
        data['data'] = []
    data['data'].append(record)
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)
    
    return {"message": "Record added successfully"}

@router.post("/deleterecord")
async def delete_record(request_data: dict):
    record_to_delete = request_data.get("record")
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=404, detail="Data file not found")
    
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    
    data['data'] = [record for record in data['data'] if record != record_to_delete]
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)
    
    return {"message": "Record deleted successfully"}

@router.get("/export")
async def export_data():
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=404, detail="Data file not found")
    
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data['data'])
    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_data = output.getvalue()
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment;filename=sales_data.csv"}
    )
