import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(
    MONGODB_URI, 
    serverSelectionTimeoutMS=30000,
    readPreference='primaryPreferred'
)
db = client["trendcast"]
    
# Collections (these are async Motor collections)
users_collection = db["users"]
sales_collection = db["sales_data"]
forecasts_collection = db["forecasts"]

async def get_database():
    # Test the connection
    try:
        await client.admin.command('ping')
        return db
    except Exception as e:
        print(f"CRITICAL: MongoDB connection error: {e}")
        return None

async def ping_db():
    try:
        await client.admin.command('ping')
        return True, "Connected"
    except Exception as e:
        return False, str(e)
