from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import bcrypt
import socketio
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class DeliveryAgentLogin(BaseModel):
    username: str
    password: str

class DeliveryAgentResponse(BaseModel):
    id: str
    username: str
    name: str
    phone: str
    status: str
    token: str

class Location(BaseModel):
    lat: float
    lng: float
    address: str

class CustomerInfo(BaseModel):
    name: str
    phone: str

class Order(BaseModel):
    id: str
    order_number: str
    pickup_location: Location
    delivery_location: Location
    assigned_agent_id: str
    status: str
    customer_info: CustomerInfo
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class OrderStatusUpdate(BaseModel):
    status: str

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    order_id: str
    agent_id: str

# Helper function to hash password
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Initialize some test data
@app.on_event("startup")
async def startup_event():
    # Create test delivery agent if doesn't exist
    agent = await db.delivery_agents.find_one({"username": "agent1"})
    if not agent:
        test_agent = {
            "username": "agent1",
            "password": hash_password("password123"),
            "name": "John Doe",
            "phone": "+1234567890",
            "status": "active",
            "created_at": datetime.utcnow()
        }
        result = await db.delivery_agents.insert_one(test_agent)
        agent_id = str(result.inserted_id)
        
        # Create test orders
        test_orders = [
            {
                "order_number": "ORD001",
                "pickup_location": {
                    "lat": 37.7749,
                    "lng": -122.4194,
                    "address": "123 Market St, San Francisco, CA"
                },
                "delivery_location": {
                    "lat": 37.8044,
                    "lng": -122.2712,
                    "address": "456 Broadway, Oakland, CA"
                },
                "assigned_agent_id": agent_id,
                "status": "pending",
                "customer_info": {
                    "name": "Alice Johnson",
                    "phone": "+1234567891"
                },
                "created_at": datetime.utcnow()
            },
            {
                "order_number": "ORD002",
                "pickup_location": {
                    "lat": 37.8044,
                    "lng": -122.2712,
                    "address": "789 Main St, Oakland, CA"
                },
                "delivery_location": {
                    "lat": 37.7749,
                    "lng": -122.4194,
                    "address": "321 Mission St, San Francisco, CA"
                },
                "assigned_agent_id": agent_id,
                "status": "pending",
                "customer_info": {
                    "name": "Bob Smith",
                    "phone": "+1234567892"
                },
                "created_at": datetime.utcnow()
            }
        ]
        await db.orders.insert_many(test_orders)
        logging.info("Test data created")

# API Routes
@api_router.post("/auth/login", response_model=DeliveryAgentResponse)
async def login(credentials: DeliveryAgentLogin):
    agent = await db.delivery_agents.find_one({"username": credentials.username})
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, agent['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate simple token (in production, use JWT)
    token = str(uuid.uuid4())
    
    return DeliveryAgentResponse(
        id=str(agent['_id']),
        username=agent['username'],
        name=agent['name'],
        phone=agent['phone'],
        status=agent['status'],
        token=token
    )

@api_router.get("/orders/assigned/{agent_id}", response_model=List[Order])
async def get_assigned_orders(agent_id: str):
    try:
        orders = await db.orders.find({"assigned_agent_id": agent_id}).to_list(100)
        result = []
        for order in orders:
            result.append(Order(
                id=str(order['_id']),
                order_number=order['order_number'],
                pickup_location=Location(**order['pickup_location']),
                delivery_location=Location(**order['delivery_location']),
                assigned_agent_id=order['assigned_agent_id'],
                status=order['status'],
                customer_info=CustomerInfo(**order['customer_info']),
                created_at=order['created_at'],
                started_at=order.get('started_at'),
                completed_at=order.get('completed_at')
            ))
        return result
    except Exception as e:
        logging.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order_detail(order_id: str):
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return Order(
            id=str(order['_id']),
            order_number=order['order_number'],
            pickup_location=Location(**order['pickup_location']),
            delivery_location=Location(**order['delivery_location']),
            assigned_agent_id=order['assigned_agent_id'],
            status=order['status'],
            customer_info=CustomerInfo(**order['customer_info']),
            created_at=order['created_at'],
            started_at=order.get('started_at'),
            completed_at=order.get('completed_at')
        )
    except Exception as e:
        logging.error(f"Error fetching order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/orders/{order_id}/start")
async def start_order(order_id: str):
    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": "in_progress", "started_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Order started successfully"}
    except Exception as e:
        logging.error(f"Error starting order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/orders/{order_id}/complete")
async def complete_order(order_id: str):
    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Order completed successfully"}
    except Exception as e:
        logging.error(f"Error completing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")
    await sio.emit('connection_response', {'status': 'connected', 'sid': sid})

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def location_update(sid, data):
    logging.info(f"Location update from {sid}: {data}")
    # Broadcast to all connected clients (user apps)
    await sio.emit('agent_location_update', data)
    # Store location in database
    try:
        await db.location_history.insert_one({
            "agent_id": data.get('agent_id'),
            "order_id": data.get('order_id'),
            "lat": data.get('lat'),
            "lng": data.get('lng'),
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        logging.error(f"Error storing location: {e}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
