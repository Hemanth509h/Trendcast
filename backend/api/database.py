import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/trendcast")
client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client.get_database()

# Collections (these are async Motor collections)
users_collection = db.get_collection("users")
sales_collection = db.get_collection("sales_data")
forecasts_collection = db.get_collection("forecasts")

async def get_database():
    # Test the connection
    try:
        await client.admin.command('ping')
    except Exception as e:
        print(f"MongoDB connection error: {e}")
    return db
