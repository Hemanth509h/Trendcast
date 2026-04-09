import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client["trendcast"]
    
# Collections (these are async Motor collections)
users_collection = db["users"]
sales_collection = db["sales_data"]
forecasts_collection = db["forecasts"]

async def get_database():
    # Test the connection
    try:
        await client.admin.command('ping')
    except Exception as e:
        print(f"MongoDB connection error: {e}")
    return db
