# 🚚 Delivery Agent App - Complete Setup Guide

A professional delivery agent mobile application with real-time GPS tracking, Google Maps navigation, and Socket.IO live location updates.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Local Setup](#local-setup)
5. [Running the Project](#running-the-project)
6. [Testing the App](#testing-the-app)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **User Authentication**: Username/password login with secure bcrypt hashing
- **Order Management**: View assigned orders with pickup and delivery locations
- **Real-time GPS Tracking**: Live location updates every 3 seconds
- **Google Maps Navigation**: Professional route display with markers
- **Socket.IO Integration**: Real-time location broadcasting to user apps
- **Speed Indicator**: Live speed tracking in km/h
- **Professional UI**: Green theme with modern, intuitive design
- **Auto-login**: Automatic authentication for faster testing

---

## 🛠 Tech Stack

### Frontend
- **Expo** (React Native framework)
- **expo-router** (File-based routing)
- **react-native-maps** (Google Maps integration)
- **expo-location** (GPS tracking)
- **socket.io-client** (Real-time communication)
- **axios** (HTTP client)
- **AsyncStorage** (Local data persistence)
- **TypeScript** (Type safety)

### Backend
- **FastAPI** (Python web framework)
- **python-socketio** (Socket.IO server)
- **Motor** (Async MongoDB driver)
- **bcrypt** (Password hashing)
- **uvicorn** (ASGI server)

### Database
- **MongoDB** (NoSQL database)

---

## 📦 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Yarn** (Package manager) - `npm install -g yarn`
- **Expo CLI** - `npm install -g expo-cli`
- **Expo Go App** - Install on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Google Maps API Key** - [Get one here](https://developers.google.com/maps/documentation/javascript/get-api-key)

---

## 🚀 Local Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd delivery-agent-app
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=delivery_app
EOF
```

### Step 3: MongoDB Setup

```bash
# Start MongoDB service
# On macOS:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod

# On Windows:
net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

### Step 4: Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
EOF
```

**⚠️ Important:** Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual Google Maps API key.

### Step 5: Configure Google Maps API Key

Edit `frontend/app.json` and update the API keys:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

---

## ▶️ Running the Project

### Terminal 1: Start MongoDB

```bash
# Ensure MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

### Terminal 2: Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn server:socket_app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
INFO:     Hyderabad test data created
```

### Terminal 3: Start Expo Frontend

```bash
cd frontend
yarn start
```

You should see:
```
Metro is running...
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## 📱 Testing the App

### Option 1: Mobile Testing (Recommended)

1. **Install Expo Go** on your mobile device
2. **Scan the QR code** displayed in Terminal 3
3. **App will load** with automatic login
4. **Test Features**:
   - View 5 Hyderabad orders
   - Tap an order to see details
   - Click "Start Delivery"
   - See live GPS tracking and navigation
   - View speed, distance, and ETA
   - Complete the delivery

### Option 2: iOS Simulator (Mac only)

```bash
# In the Expo terminal, press 'i'
# Or run:
yarn ios
```

### Option 3: Android Emulator

```bash
# Ensure Android emulator is running
# In the Expo terminal, press 'a'
# Or run:
yarn android
```

### Option 4: Web Preview (Limited)

```bash
# In the Expo terminal, press 'w'
# Or open: http://localhost:3000
```

**Note:** Maps and GPS features won't work on web.

---

## 🔐 Demo Credentials

**Username:** `agent1`  
**Password:** `password123`

The app automatically fills and submits these credentials!

**Agent Details:**
- Name: Rajesh Kumar
- Phone: +91 9876543210
- Status: Active

---

## 📍 Test Orders

5 delivery orders in Hyderabad, India (within 5km radius):

| Order # | Pickup | Delivery | Distance |
|---------|--------|----------|----------|
| HYD001 | Banjara Hills | Jubilee Hills | ~2 km |
| HYD002 | Somajiguda | Madhapur HITEC City | ~5 km |
| HYD003 | Kondapur | Gachibowli DLF Cyber City | ~4 km |
| HYD004 | Uppal | Begumpet Paradise Circle | ~6 km |
| HYD005 | Kukatpally KPHB | Miyapur BHEL | ~3 km |

---

## 📚 API Documentation

### Base URL
```
http://localhost:8001/api
```

### Endpoints

#### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "agent1",
  "password": "password123"
}

Response:
{
  "id": "string",
  "username": "string",
  "name": "string",
  "phone": "string",
  "status": "string",
  "token": "string"
}
```

#### 2. Get Assigned Orders
```http
GET /api/orders/assigned/{agent_id}

Response: Array of Order objects
```

#### 3. Get Order Details
```http
GET /api/orders/{order_id}

Response: Order object
```

#### 4. Start Delivery
```http
PUT /api/orders/{order_id}/start

Response:
{
  "message": "Order started successfully"
}
```

#### 5. Complete Delivery
```http
PUT /api/orders/{order_id}/complete

Response:
{
  "message": "Order completed successfully"
}
```

### Socket.IO Events

#### Connect to Socket.IO
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8001', {
  transports: ['websocket', 'polling']
});
```

#### Events

**Client → Server:**
```javascript
// Send location update
socket.emit('location_update', {
  lat: 17.3850,
  lng: 78.4867,
  order_id: "order_id_here",
  agent_id: "agent_id_here",
  timestamp: "2025-01-01T00:00:00Z",
  speed: 25.5,
  heading: 180,
  accuracy: 10
});
```

**Server → Client:**
```javascript
// Receive location updates
socket.on('agent_location_update', (data) => {
  console.log('Agent location:', data);
  // Update map marker with new position
});

// Connection response
socket.on('connection_response', (data) => {
  console.log('Connected:', data);
});
```

---

## 🗄 Database Schema

### Collection: delivery_agents
```javascript
{
  _id: ObjectId,
  username: String,
  password: String (bcrypt hashed),
  name: String,
  phone: String,
  status: String ("active" | "inactive"),
  created_at: DateTime
}
```

### Collection: orders
```javascript
{
  _id: ObjectId,
  order_number: String,
  pickup_location: {
    lat: Number,
    lng: Number,
    address: String
  },
  delivery_location: {
    lat: Number,
    lng: Number,
    address: String
  },
  assigned_agent_id: String,
  status: String ("pending" | "in_progress" | "completed"),
  customer_info: {
    name: String,
    phone: String
  },
  created_at: DateTime,
  started_at: DateTime,
  completed_at: DateTime
}
```

### Collection: location_history
```javascript
{
  _id: ObjectId,
  agent_id: String,
  order_id: String,
  lat: Number,
  lng: Number,
  timestamp: DateTime
}
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=delivery_app
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## 🐛 Troubleshooting

### Issue 1: MongoDB Connection Error
```
Error: MongoServerError: connect ECONNREFUSED
```

**Solution:**
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
net start MongoDB                      # Windows
```

### Issue 2: Expo Not Loading
```
Error: Cannot connect to Metro
```

**Solution:**
```bash
# Clear cache and restart
cd frontend
yarn start --clear
```

### Issue 3: Maps Not Showing
```
Error: Google Maps not configured
```

**Solution:**
1. Verify Google Maps API key is correct
2. Enable required APIs in Google Cloud Console:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Directions API
3. Add billing information to Google Cloud account

### Issue 4: Location Permission Denied
```
Error: Location permission not granted
```

**Solution:**
- **iOS:** Settings → Privacy → Location Services → Expo Go → While Using
- **Android:** Settings → Apps → Expo Go → Permissions → Location → Allow

### Issue 5: Socket.IO Not Connecting
```
Socket not connected
```

**Solution:**
```bash
# Restart backend with socket_app
cd backend
uvicorn server:socket_app --host 0.0.0.0 --port 8001 --reload

# Check if socket endpoint is accessible
curl http://localhost:8001/socket.io/?EIO=4&transport=polling
```

### Issue 6: Port Already in Use
```
Error: Address already in use
```

**Solution:**
```bash
# Find and kill process on port 8001
lsof -ti:8001 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8001   # Windows
```

---

## 📦 Building for Production

### Android APK
```bash
cd frontend
eas build --platform android --profile production
```

### iOS IPA
```bash
cd frontend
eas build --platform ios --profile production
```

---

## 🔒 Security Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Enable MongoDB authentication** in production
4. **Use HTTPS** for production API endpoints
5. **Implement JWT tokens** instead of simple UUIDs
6. **Add rate limiting** to prevent API abuse
7. **Validate all user inputs** on backend

---

## 📝 License

This project is licensed under the MIT License.

---

## 👥 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [API Documentation](#api-documentation)
3. Contact the development team

---

## 🎯 Next Steps

After setup, you can:
1. Test all delivery workflows
2. Monitor real-time location updates
3. Integrate with existing user app
4. Add more features:
   - Push notifications
   - Order history
   - Earnings dashboard
   - Multiple stops per delivery
   - Photo proof of delivery
   - Customer signature

---

**Happy Coding! 🚀**
