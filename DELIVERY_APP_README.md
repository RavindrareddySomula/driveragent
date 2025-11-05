# Delivery Agent App

A dedicated mobile application for delivery agents with real-time location tracking and Google Maps navigation.

## Features

### 1. **Authentication**
- Username/password login for delivery agents
- Demo credentials:
  - Username: `agent1`
  - Password: `password123`

### 2. **Order Management**
- View all assigned orders
- Order list with status badges (Pending, In Progress, Completed)
- Pull-to-refresh functionality
- Order details with pickup and delivery locations

### 3. **Real-time Location Tracking**
- GPS tracking using expo-location
- Real-time location updates sent via Socket.IO every 5 seconds
- User app can receive live agent location updates

### 4. **Map Navigation**
- Google Maps integration for route display
- Shows pickup location (red marker)
- Shows delivery location (green marker)
- Shows agent's current location (blue marker)
- Route polyline from current location → pickup → delivery
- Distance and duration display
- Re-center map button

### 5. **Order Workflow**
- **Pending Orders**: Click "Start Delivery" to begin
- **In Progress Orders**: 
  - View live navigation
  - Mark as completed when done
- **Completed Orders**: Shows completion status

## Tech Stack

### Frontend
- **Expo** - React Native framework
- **expo-router** - File-based routing
- **react-native-maps** - Google Maps integration
- **expo-location** - GPS and location services
- **socket.io-client** - Real-time communication
- **axios** - HTTP client
- **@react-native-async-storage/async-storage** - Local storage

### Backend
- **FastAPI** - Python web framework
- **python-socketio** - Socket.IO server
- **Motor** - Async MongoDB driver
- **bcrypt** - Password hashing

### Database
- **MongoDB** - Document database

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login delivery agent

### Orders
- `GET /api/orders/assigned/{agent_id}` - Get orders assigned to agent
- `GET /api/orders/{order_id}` - Get order details
- `PUT /api/orders/{order_id}/start` - Start delivery
- `PUT /api/orders/{order_id}/complete` - Complete delivery

### Socket.IO Events
- `connect` - Client connected
- `disconnect` - Client disconnected
- `location_update` - Send agent location update
- `agent_location_update` - Broadcast to user apps

## Database Schema

### DeliveryAgent
```json
{
  "_id": "ObjectId",
  "username": "string",
  "password": "string (hashed)",
  "name": "string",
  "phone": "string",
  "status": "active",
  "created_at": "datetime"
}
```

### Order
```json
{
  "_id": "ObjectId",
  "order_number": "string",
  "pickup_location": {
    "lat": "float",
    "lng": "float",
    "address": "string"
  },
  "delivery_location": {
    "lat": "float",
    "lng": "float",
    "address": "string"
  },
  "assigned_agent_id": "string",
  "status": "pending|in_progress|completed",
  "customer_info": {
    "name": "string",
    "phone": "string"
  },
  "created_at": "datetime",
  "started_at": "datetime",
  "completed_at": "datetime"
}
```

## Environment Variables

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=http://35.223.234.30
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBGtR-Hnh8Ar4RMM59GzK498_pOQCBlbdM
```

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
```

## Testing the App

### Mobile Testing (Recommended)
1. Install Expo Go app on your mobile device
2. Scan the QR code displayed in the terminal
3. The app will load with full functionality including maps

### Testing Flow
1. Login with demo credentials (agent1 / password123)
2. View assigned orders on the Orders tab
3. Click on an order to view details
4. Click "Start Delivery" to begin
5. Map screen will open with:
   - Your current location
   - Pickup location marker
   - Delivery location marker
   - Route between all points
6. Real-time location updates are sent via Socket.IO
7. Click "Complete" to mark delivery as done

## Integration with User App

The delivery agent app sends real-time location updates via Socket.IO. To integrate with a user app:

1. **Connect to Socket.IO server**:
   ```javascript
   import { io } from 'socket.io-client';
   const socket = io('http://BACKEND_URL');
   ```

2. **Listen for agent location updates**:
   ```javascript
   socket.on('agent_location_update', (data) => {
     console.log('Agent location:', data);
     // data contains: { lat, lng, order_id, agent_id }
     // Update map marker with agent's new position
   });
   ```

3. **Filter by order ID**:
   ```javascript
   socket.on('agent_location_update', (data) => {
     if (data.order_id === currentOrderId) {
       updateAgentMarker(data.lat, data.lng);
     }
   });
   ```

## Known Limitations

1. **Web Version**: react-native-maps doesn't work on web browsers. The app is designed for mobile devices (iOS/Android).

2. **Background Location**: For production, you'll need to implement background location tracking using `expo-task-manager` and `expo-location` background modes.

3. **Authentication**: Currently uses simple token-based auth. For production, implement JWT with refresh tokens.

## Future Enhancements

1. **Push Notifications**: Notify agents of new order assignments
2. **Order History**: View completed deliveries
3. **Earnings Dashboard**: Track daily/weekly earnings
4. **Route Optimization**: Suggest optimal routes for multiple deliveries
5. **Chat Feature**: In-app chat with customers
6. **Photo Proof**: Take delivery proof photos
7. **Signature Capture**: Customer signature on delivery
8. **Offline Support**: Cache orders for offline access

## Support

For issues or questions, please refer to the main documentation or contact support.
