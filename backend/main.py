from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, text, inspect
import re
import asyncio
import json
import aiohttp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
sql_database_url = os.getenv("SQL_DATABASE_URL")
if sql_database_url:
    engine = create_engine(sql_database_url)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
model = os.getenv("MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
class QueryRequest(BaseModel):
    query: str
    db_type: str  
    collection_name: Optional[str] = None  

class ExecuteRequest(BaseModel):
    query: str
    db_type: str
    collection_name: Optional[str] = None

class QueryResponse(BaseModel):
    generated_query: str
    explanation: str
    optimization_tips: str
    db_type: str

class ExecuteResponse(BaseModel):
    success: bool
    results: List[Dict[str, Any]]
    row_count: int
    error: Optional[str] = None

class TableInfo(BaseModel):
    name: str
    count: int

class SchemaResponse(BaseModel):
    schema_info: Dict[str, Any]
    sample_data: List[Dict[str, Any]]

class InsightResponse(BaseModel):
    common_queries: List[str]
    frequent_tables: List[TableInfo]
def extract_first_json(text: str) -> dict:
    stack = []
    start_idx = None

    for idx, char in enumerate(text):
        if char == '{':
            if start_idx is None:
                start_idx = idx
            stack.append('{')
        elif char == '}':
            if stack:
                stack.pop()
                if not stack and start_idx is not None:
                    json_str = text[start_idx:idx+1]
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError as e:
                        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    raise HTTPException(status_code=400, detail="No valid JSON found in text")

def is_safe_sql_query(query: str) -> bool:
    query_lower = query.lower().strip()
    destructive_keywords = [
        r'\bdrop\b', r'\bdelete\b', r'\btruncate\b', r'\bupdate\b',
        r'\binsert\b', r'\balter\b', r'\bcreate\b', r'\breplace\b',
        r'\bgrant\b', r'\brevoke\b'
    ]
    
    for keyword in destructive_keywords:
        if re.search(keyword, query_lower):
            return False
    
    return True

def is_safe_mongo_query(query_str: str) -> bool:
    query_lower = query_str.lower()
    destructive_keywords = [
        'drop', 'remove', 'delete', 'bulkwrite', 'update',
        'insert', 'replace', '$where'
    ]
    
    for keyword in destructive_keywords:
        if keyword in query_lower:
            return False
    
    return True

async def convert_nl_to_query(nl_query: str, db_type: str) -> Dict[str, str]:
    
    if db_type.lower() == "sql":
        system_prompt = """You are an expert SQL query generator. Convert natural language to MySQL SELECT queries only.
        
Database schema:
- customers (customer_id, name, email, country, city, registration_date)
- products (product_id, name, category, price, stock_quantity)
- orders (order_id, customer_id, order_date, total_amount, status)
- order_items (item_id, order_id, product_id, quantity, price)

Rules:
1. Generate ONLY SELECT queries
2. Use proper JOINs when needed
3. Include LIMIT clause for large results
4. Provide clear explanation and optimization tips
5. Return response in format: QUERY|||EXPLANATION|||OPTIMIZATION"""
    else:
        system_prompt = """You are an expert MongoDB query generator. Convert natural language to MongoDB find/aggregate queries.
        
Database collections:
- users (user_id, name, email, age, country, registration_date)
- events (event_id, user_id, event_type, timestamp, properties)
- sessions (session_id, user_id, start_time, end_time, duration_minutes)

Rules:
1. Generate ONLY find() or aggregate() queries
2. Return as valid JSON object
3. Provide clear explanation and optimization tips
4. Return response in format: QUERY|||EXPLANATION|||OPTIMIZATION"""
    
    user_prompt = f"Convert this to a {db_type.upper()} query: {nl_query}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
            ) as response:
                result = await response.json()
                logger.error(f"Groq raw response: {result}")
                if "error" in result:
                    raise Exception(result["error"].get("message", "Unknown Groq error"))
                if "choices" not in result or len(result["choices"]) == 0:
                    raise Exception("Groq API returned no 'choices' field")
                content = result["choices"][0]["message"]["content"]


                content = result['choices'][0]['message']['content']
                
                # Parse the response
                parts = content.split('|||')
                if len(parts) >= 3:
                    return {
                        "query": parts[0].strip(),
                        "explanation": parts[1].strip(),
                        "optimization": parts[2].strip()
                    }
                else:
                    # Fallback parsing
                    return {
                        "query": content.strip(),
                        "explanation": "Query generated successfully",
                        "optimization": "Consider adding indexes for better performance"
                    }
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to convert query: {str(e)}")

@api_router.post("/convert-query", response_model=QueryResponse)
async def convert_query(request: QueryRequest):
    try:
        result = await convert_nl_to_query(request.query, request.db_type)
        query_log = {
            "id": str(uuid.uuid4()),
            "nl_query": request.query,
            "db_type": request.db_type,
            "generated_query": result["query"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.query_history.insert_one(query_log)
        
        return QueryResponse(
            generated_query=result["query"],
            explanation=result["explanation"],
            optimization_tips=result["optimization"],
            db_type=request.db_type
        )
    except Exception as e:
        logger.error(f"Error in convert_query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/execute-query", response_model=ExecuteResponse)
async def execute_query(request: ExecuteRequest):
    try:
        if request.db_type.lower() == "sql":
            import re
            query_str = re.sub(r'(?i)(QUERY:|FINAL RESPONSE:|EXPLANATION:|OPTIMIZATION:)', '', request.query)
            query_str = re.sub(r'```sql|```|`', '', query_str, flags=re.IGNORECASE).strip()
            sql_query = next((line.strip() for line in query_str.splitlines() if line.strip()), "")
            if not sql_query:
                raise HTTPException(status_code=400, detail="No valid SQL found in request")
            if not is_safe_sql_query(sql_query):
                raise HTTPException(status_code=400, detail="Destructive SQL queries are not allowed")
            with engine.connect() as conn:
                result = conn.execute(text(sql_query))
                rows = [dict(row._mapping) for row in result]

            return ExecuteResponse(success=True, results=rows, row_count=len(rows))

        elif request.db_type.lower() == "mongodb":
            import json
            import re

            query_str = request.query.strip()
            query_str = re.sub(r"```json|```", "", query_str, flags=re.IGNORECASE | re.DOTALL)
            query_str = re.sub(r"(?i)query:|explanation:|optimization:", "", query_str).strip()
            
            def extract_first_json(text: str) -> dict:
                stack = []
                start_idx = None
                for idx, char in enumerate(text):
                    if char == '{':
                        if start_idx is None:
                            start_idx = idx
                        stack.append('{')
                    elif char == '}':
                        if stack:
                            stack.pop()
                            if not stack and start_idx is not None:
                                json_str = text[start_idx:idx+1]
                                try:
                                    return json.loads(json_str)
                                except json.JSONDecodeError as e:
                                    raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
                raise HTTPException(status_code=400, detail="No valid JSON found in query")
            
            query_obj = extract_first_json(query_str)
            collection_name = request.collection_name or query_obj.get("find") or query_obj.get("aggregate") or "users"
            collection = db[collection_name]

            if "find" in query_obj:
                filter_dict = query_obj.get("filter", {})
                projection = query_obj.get("projection", {"_id": 0})
                cursor = collection.find(filter_dict, projection).limit(100)
            elif "aggregate" in query_obj:
                pipeline = query_obj.get("pipeline", [])
                cursor = collection.aggregate(pipeline)
            else:
                cursor = collection.find(query_obj, {"_id": 0}).limit(100)

            results = await cursor.to_list(length=100)
            return ExecuteResponse(success=True, results=results, row_count=len(results))

    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return ExecuteResponse(success=False, results=[], row_count=0, error=str(e))


@api_router.get("/tables")
async def get_sql_tables():
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error getting tables: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/collections")
async def get_mongo_collections():
    try:
        collections = await db.list_collection_names()
        return {"collections": collections}
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schema/{db_type}/{name}", response_model=SchemaResponse)
async def get_schema(db_type: str, name: str):
    try:
        db_type = db_type.lower()
        if db_type not in ["sql", "mongodb"]:
            raise HTTPException(status_code=400, detail=f"Invalid db_type: {db_type}")

        if db_type == "sql":
            inspector = inspect(engine)
            columns = inspector.get_columns(name)
            
            schema = {
                "columns": [
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col.get("nullable", True)
                    }
                    for col in columns
                ]
            }
            
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {name} LIMIT 5"))
                sample_data = [dict(row._mapping) for row in result]
            
            return SchemaResponse(schema_info=schema, sample_data=sample_data)

        elif db_type == "mongodb":
            collection = db[name]
            sample_doc = await collection.find_one({}, {"_id": 0})
            
            schema = {
                "fields": [
                    {"name": key, "type": type(value).__name__}
                    for key, value in (sample_doc or {}).items()
                ]
            }
            
            cursor = collection.find({}, {"_id": 0}).limit(5)
            sample_data = await cursor.to_list(length=5)
            
            return SchemaResponse(schema_info=schema, sample_data=sample_data)

    except Exception as e:
        logger.error(f"Error getting schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/insights", response_model=InsightResponse)
async def get_insights():
    try:
        pipeline = [
            {"$group": {"_id": "$nl_query", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        common_queries_cursor = db.query_history.aggregate(pipeline)
        common_queries = [doc["_id"] async for doc in common_queries_cursor]
        
        freq_tables = [
    {"name": "customers", "count": 45, "db_type": "sql"},
    {"name": "orders", "count": 38, "db_type": "sql"},
    {"name": "products", "count": 32, "db_type": "sql"},
    {"name": "users", "count": 28, "db_type": "mongodb"},
    {"name": "events", "count": 15, "db_type": "mongodb"},
]
        return InsightResponse(
            common_queries=common_queries if common_queries else [
                "Show all customers from India",
                "Top 5 products by sales",
                "Users aged > 30"
            ],
            frequent_tables=freq_tables
        )
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    await init_sample_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

async def init_sample_data():
    try:
        from sqlalchemy import text as sql_text
        with engine.connect() as conn:
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100),
                    email VARCHAR(100),
                    country VARCHAR(50),
                    city VARCHAR(50),
                    registration_date DATE
                )
            """))
            
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS products (
                    product_id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100),
                    category VARCHAR(50),
                    price DECIMAL(10,2),
                    stock_quantity INT
                )
            """))
            
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS orders (
                    order_id INT PRIMARY KEY AUTO_INCREMENT,
                    customer_id INT,
                    order_date DATE,
                    total_amount DECIMAL(10,2),
                    status VARCHAR(20)
                )
            """))
            
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS order_items (
                    item_id INT PRIMARY KEY AUTO_INCREMENT,
                    order_id INT,
                    product_id INT,
                    quantity INT,
                    price DECIMAL(10,2)
                )
            """))
            
            conn.commit()
            result = conn.execute(sql_text("SELECT COUNT(*) as count FROM customers"))
            count = result.fetchone()[0]
            
            if count == 0:
                conn.execute(sql_text("""
                    INSERT INTO customers (name, email, country, city, registration_date) VALUES
                    ('Anant Singh', 'anant@gmail.com', 'India', 'Mumbai', '2025-01-15'),
                    ('Sandhya Piath', 'sandhya@gmail.com', 'USA', 'New York', '2025-02-20'),
                    ('Amit Patel', 'amit@gmail.com', 'India', 'Delhi', '2025-03-10'),
                    ('Dhruv Mishra', 'dhruv@gmail.com', 'UK', 'London', '2025-04-05'),
                    ('Shifa Khan', 'shifa@gmail.com', 'Dubai', 'Jumeirah', '2025-04-05'),
                    ('Priya Singh', 'priya@gmail.com', 'India', 'Bangalore', '2025-05-12')
                """))
                
                conn.execute(sql_text("""
                    INSERT INTO products (name, category, price, stock_quantity) VALUES
                    ('Laptop', 'Electronics', 899.99, 50),
                    ('Smartphone', 'Electronics', 599.99, 100),
                    ('Headphones', 'Accessories', 79.99, 200),
                    ('Keyboard', 'Accessories', 49.99, 150),
                    ('Mouse', 'Accessories', 29.99, 300)
                """))
                
                conn.execute(sql_text("""
                    INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
                    (1, '2025-06-01', 979.98, 'delivered'),
                    (2, '2025-06-05', 599.99, 'delivered'),
                    (3, '2025-06-10', 129.98, 'shipped'),
                    (4, '2025-06-15', 899.99, 'processing'),
                    (5, '2025-06-20', 79.99, 'delivered')
                """))
                
                conn.commit()
                logger.info("MySQL sample data initialized")
        
        users_count = await db.users.count_documents({})
        if users_count == 0:
            await db.users.insert_many([
                {
                    "user_id": "U001",
                    "name": "Arya Tiwari",
                    "email": "arya@gmail.com",
                    "age": 32,
                    "country": "USA",
                    "registration_date": "2025-01-15"
                },
                {
                    "user_id": "U002",
                    "name": "Pradeep Khushwaha",
                    "email": "pradeep@gmail.com",
                    "age": 28,
                    "country": "UK",
                    "registration_date": "2025-02-20"
                },
                {
                    "user_id": "U003",
                    "name": "Rahul Sharma",
                    "email": "rahul@gmail.com",
                    "age": 35,
                    "country": "India",
                    "registration_date": "2025-03-10"
                },
                {
                    "user_id": "U004",
                    "name": "Tasmayee Singh",
                    "email": "tasmayee@gmail.com",
                    "age": 29,
                    "country": "Spain",
                    "registration_date": "2025-04-05"
                },
                {
                    "user_id": "U005",
                    "name": "Krishna Jaiswal",
                    "email": "krishna@gmail.com",
                    "age": 41,
                    "country": "China",
                    "registration_date": "2025-05-12"
                }
            ])
            
            await db.events.insert_many([
                {
                    "event_id": "E001",
                    "user_id": "U001",
                    "event_type": "page_view",
                    "timestamp": "2025-06-01T10:30:00Z",
                    "properties": {"page": "/home"}
                },
                {
                    "event_id": "E002",
                    "user_id": "U002",
                    "event_type": "purchase",
                    "timestamp": "2025-06-02T14:20:00Z",
                    "properties": {"amount": 99.99, "product": "Headphones"}
                },
                {
                    "event_id": "E003",
                    "user_id": "U003",
                    "event_type": "signup",
                    "timestamp": "2025-06-03T09:15:00Z",
                    "properties": {"source": "google"}
                }
            ])
            
            await db.sessions.insert_many([
                {
                    "session_id": "S001",
                    "user_id": "U001",
                    "start_time": "2025-06-01T10:00:00Z",
                    "end_time": "2025-06-01T10:45:00Z",
                    "duration_minutes": 45
                },
                {
                    "session_id": "S002",
                    "user_id": "U002",
                    "start_time": "2025-06-02T14:00:00Z",
                    "end_time": "2025-06-02T15:30:00Z",
                    "duration_minutes": 90
                }
            ])
            
            logger.info("MongoDB sample data initialized")
    
    except Exception as e:
        logger.error(f"Error initializing sample data: {e}")