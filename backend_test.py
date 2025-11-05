#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Delivery Agent App
Tests all authentication, order management, and Socket.IO functionality
"""

import requests
import json
import time
import asyncio
import socketio
from datetime import datetime
import sys
import os

# Get backend URL from environment
BACKEND_URL = "http://localhost:8001"
API_BASE_URL = f"{BACKEND_URL}/api"

class DeliveryAgentAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.agent_id = None
        self.token = None
        self.test_orders = []
        self.socket_client = None
        
    def log_test(self, test_name, status, message=""):
        """Log test results with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"[{timestamp}] {status_symbol} {test_name}: {message}")
        
    def test_authentication_valid(self):
        """Test login with valid credentials"""
        try:
            login_data = {
                "username": "agent1",
                "password": "password123"
            }
            
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'username', 'name', 'phone', 'status', 'token']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Authentication Valid", "FAIL", f"Missing fields: {missing_fields}")
                    return False
                
                # Store for subsequent tests
                self.agent_id = data['id']
                self.token = data['token']
                
                self.log_test("Authentication Valid", "PASS", f"Agent ID: {self.agent_id}")
                return True
            else:
                self.log_test("Authentication Valid", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication Valid", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_authentication_invalid(self):
        """Test login with invalid credentials"""
        try:
            login_data = {
                "username": "invalid_user",
                "password": "wrong_password"
            }
            
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 401:
                self.log_test("Authentication Invalid", "PASS", "Correctly rejected invalid credentials")
                return True
            else:
                self.log_test("Authentication Invalid", "FAIL", f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Authentication Invalid", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_get_assigned_orders(self):
        """Test getting assigned orders for an agent"""
        if not self.agent_id:
            self.log_test("Get Assigned Orders", "FAIL", "No agent_id available (login first)")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/orders/assigned/{self.agent_id}")
            
            if response.status_code == 200:
                orders = response.json()
                
                if not isinstance(orders, list):
                    self.log_test("Get Assigned Orders", "FAIL", "Response is not an array")
                    return False
                
                if len(orders) == 0:
                    self.log_test("Get Assigned Orders", "WARN", "No orders found for agent")
                    return True
                
                # Validate order structure
                required_order_fields = ['id', 'order_number', 'pickup_location', 'delivery_location', 'status', 'customer_info']
                
                for i, order in enumerate(orders):
                    missing_fields = [field for field in required_order_fields if field not in order]
                    if missing_fields:
                        self.log_test("Get Assigned Orders", "FAIL", f"Order {i} missing fields: {missing_fields}")
                        return False
                
                # Store orders for subsequent tests
                self.test_orders = orders
                self.log_test("Get Assigned Orders", "PASS", f"Found {len(orders)} orders")
                return True
            else:
                self.log_test("Get Assigned Orders", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Assigned Orders", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_get_order_detail(self):
        """Test getting order details"""
        if not self.test_orders:
            self.log_test("Get Order Detail", "FAIL", "No orders available for testing")
            return False
            
        try:
            order_id = self.test_orders[0]['id']
            response = self.session.get(f"{API_BASE_URL}/orders/{order_id}")
            
            if response.status_code == 200:
                order = response.json()
                
                required_fields = ['id', 'order_number', 'pickup_location', 'delivery_location', 'status', 'customer_info']
                missing_fields = [field for field in required_fields if field not in order]
                
                if missing_fields:
                    self.log_test("Get Order Detail", "FAIL", f"Missing fields: {missing_fields}")
                    return False
                
                self.log_test("Get Order Detail", "PASS", f"Order {order_id} details retrieved")
                return True
            else:
                self.log_test("Get Order Detail", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Order Detail", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_start_order(self):
        """Test starting an order"""
        if not self.test_orders:
            self.log_test("Start Order", "FAIL", "No orders available for testing")
            return False
            
        try:
            # Find a pending order
            pending_order = None
            for order in self.test_orders:
                if order['status'] == 'pending':
                    pending_order = order
                    break
            
            if not pending_order:
                self.log_test("Start Order", "WARN", "No pending orders found to start")
                return True
            
            order_id = pending_order['id']
            response = self.session.put(f"{API_BASE_URL}/orders/{order_id}/start")
            
            if response.status_code == 200:
                # Verify the order status changed
                detail_response = self.session.get(f"{API_BASE_URL}/orders/{order_id}")
                if detail_response.status_code == 200:
                    updated_order = detail_response.json()
                    if updated_order['status'] == 'in_progress' and updated_order.get('started_at'):
                        self.log_test("Start Order", "PASS", f"Order {order_id} started successfully")
                        
                        # Update our local copy for completion test
                        for i, order in enumerate(self.test_orders):
                            if order['id'] == order_id:
                                self.test_orders[i] = updated_order
                                break
                        
                        return True
                    else:
                        self.log_test("Start Order", "FAIL", f"Order status not updated correctly: {updated_order['status']}")
                        return False
                else:
                    self.log_test("Start Order", "FAIL", "Could not verify order status after start")
                    return False
            else:
                self.log_test("Start Order", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Start Order", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_complete_order(self):
        """Test completing an order"""
        if not self.test_orders:
            self.log_test("Complete Order", "FAIL", "No orders available for testing")
            return False
            
        try:
            # Find an in_progress order
            in_progress_order = None
            for order in self.test_orders:
                if order['status'] == 'in_progress':
                    in_progress_order = order
                    break
            
            if not in_progress_order:
                self.log_test("Complete Order", "WARN", "No in_progress orders found to complete")
                return True
            
            order_id = in_progress_order['id']
            response = self.session.put(f"{API_BASE_URL}/orders/{order_id}/complete")
            
            if response.status_code == 200:
                # Verify the order status changed
                detail_response = self.session.get(f"{API_BASE_URL}/orders/{order_id}")
                if detail_response.status_code == 200:
                    updated_order = detail_response.json()
                    if updated_order['status'] == 'completed' and updated_order.get('completed_at'):
                        self.log_test("Complete Order", "PASS", f"Order {order_id} completed successfully")
                        return True
                    else:
                        self.log_test("Complete Order", "FAIL", f"Order status not updated correctly: {updated_order['status']}")
                        return False
                else:
                    self.log_test("Complete Order", "FAIL", "Could not verify order status after completion")
                    return False
            else:
                self.log_test("Complete Order", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Order", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_socket_connection(self):
        """Test Socket.IO connection and events"""
        try:
            # Check if Socket.IO endpoint exists first
            import requests
            try:
                response = requests.get(f"{BACKEND_URL}/socket.io/", timeout=5)
                if response.status_code == 404:
                    self.log_test("Socket.IO Connection", "FAIL", "Socket.IO endpoint not found (404). Socket.IO may not be properly mounted.")
                    return False
            except Exception as e:
                self.log_test("Socket.IO Connection", "FAIL", f"Cannot reach Socket.IO endpoint: {str(e)}")
                return False
            
            # Create Socket.IO client
            sio = socketio.Client()
            connection_received = False
            connected = False
            
            @sio.event
            def connect():
                nonlocal connected
                connected = True
                self.log_test("Socket.IO Connect", "PASS", "Connected to server")
            
            @sio.event
            def connection_response(data):
                nonlocal connection_received
                connection_received = True
                self.log_test("Socket.IO Connection Response", "PASS", f"Received: {data}")
            
            @sio.event
            def disconnect():
                self.log_test("Socket.IO Disconnect", "PASS", "Disconnected from server")
            
            # Connect to server
            sio.connect(BACKEND_URL, wait_timeout=10)
            
            if not connected:
                self.log_test("Socket.IO Connection", "FAIL", "Failed to connect to Socket.IO server")
                return False
            
            # Wait for connection response
            time.sleep(2)
            
            if not connection_received:
                self.log_test("Socket.IO Connection Response", "WARN", "No connection response received (server may not send it)")
            
            # Test location update
            if self.agent_id and self.test_orders:
                location_data = {
                    'agent_id': self.agent_id,
                    'order_id': self.test_orders[0]['id'] if self.test_orders else 'test_order',
                    'lat': 37.7749,
                    'lng': -122.4194
                }
                
                sio.emit('location_update', location_data)
                time.sleep(1)
                
                self.log_test("Socket.IO Location Update", "PASS", "Location update sent")
            
            sio.disconnect()
            return True
            
        except Exception as e:
            self.log_test("Socket.IO Connection", "FAIL", f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 80)
        print("DELIVERY AGENT APP - BACKEND API TESTS")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base URL: {API_BASE_URL}")
        print("=" * 80)
        
        test_results = {}
        
        # Authentication Tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        test_results['auth_valid'] = self.test_authentication_valid()
        test_results['auth_invalid'] = self.test_authentication_invalid()
        
        # Order Management Tests
        print("\n📦 ORDER MANAGEMENT TESTS")
        print("-" * 40)
        test_results['get_assigned_orders'] = self.test_get_assigned_orders()
        test_results['get_order_detail'] = self.test_get_order_detail()
        test_results['start_order'] = self.test_start_order()
        test_results['complete_order'] = self.test_complete_order()
        
        # Socket.IO Tests
        print("\n🔌 SOCKET.IO TESTS")
        print("-" * 40)
        test_results['socket_connection'] = self.test_socket_connection()
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check logs above for details.")
            return False

def main():
    """Main test execution"""
    tester = DeliveryAgentAPITester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()