import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGODB_URI)
db = client["trendcast"]
sales_collection = db["sales_data"]

async def main():
    uploads = await sales_collection.find({}, {"records": 0}).to_list(None)
    for upload in uploads:
        print(f"_id: {upload.get('_id')}")
        print(f"id: {upload.get('id')}")
        print(f"filename: {upload.get('filename')}")
        print("-----")

if __name__ == "__main__":
    asyncio.run(main())
