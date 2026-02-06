#!/usr/bin/env python3
"""
FlipFoundry Backend API Testing
Tests the FastAPI proxy server that forwards requests to Next.js on port 3000
"""

import requests
import sys
import json
from datetime import datetime

class FlipFoundryAPITester:
    def __init__(self, base_url="https://repo-audit-master.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_json = response.json()
                print(f"   Response: {json.dumps(response_json, indent=2)[:200]}...")
            except:
                print(f"   Response Text: {response.text[:200]}...")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response_json if 'response_json' in locals() else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out")
            self.failed_tests.append(f"{name}: Request timed out")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )

    def test_search_status(self):
        """Test search status endpoint"""
        return self.run_test(
            "Search Status",
            "GET",
            "/api/search/status",
            200
        )

    def test_cache_stats(self):
        """Test cache statistics endpoint"""
        return self.run_test(
            "Cache Statistics",
            "GET",
            "/api/search/cache/stats",
            200
        )

    def test_search_valid(self):
        """Test search with valid keywords"""
        # The API returns 520 for service unavailable, not 503
        success, response = self.run_test(
            "Valid Search - Service Unavailable",
            "POST",
            "/api/search",
            520,  # API returns 520 when eBay API is not configured
            data={
                "keywords": "laptop",
                "minPrice": 100,
                "maxPrice": 1000,
                "condition": ["new"]  # condition should be an array
            }
        )
        
        # Also check that the error message is correct
        if success and response.get('error', {}).get('code') == 'SERVICE_UNAVAILABLE':
            print("✅ Service unavailable error message is correct")
            return success, response
        elif not success:
            return False, response
        else:
            print("⚠️  Unexpected response format")
            return False, response

    def test_search_invalid_empty_keywords(self):
        """Test search with empty keywords - should return validation error"""
        return self.run_test(
            "Search with Empty Keywords",
            "POST", 
            "/api/search",
            400,  # Should return validation error
            data={
                "keywords": "",
                "minPrice": 100,
                "maxPrice": 1000
            }
        )

    def test_search_invalid_json(self):
        """Test search with malformed JSON"""
        url = f"{self.base_url}/api/search"
        print(f"\n🔍 Testing Search with Invalid JSON...")
        print(f"   URL: {url}")
        
        try:
            # Send malformed JSON
            response = requests.post(
                url, 
                data="invalid json", 
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == 400
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Got expected 400 status")
            else:
                print(f"❌ Failed - Expected 400, got {response.status_code}")
                self.failed_tests.append(f"Invalid JSON Search: Expected 400, got {response.status_code}")
            
            self.tests_run += 1
            return success, {}
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"Invalid JSON Search: {str(e)}")
            self.tests_run += 1
            return False, {}

def main():
    """Main test execution"""
    print("🚀 Starting FlipFoundry Backend API Tests")
    print("=" * 50)
    
    tester = FlipFoundryAPITester()
    
    # Test basic endpoints
    print("\n📋 Testing Basic Endpoints...")
    tester.test_health_check()
    tester.test_search_status()
    tester.test_cache_stats()
    
    # Test search functionality  
    print("\n🔍 Testing Search Functionality...")
    tester.test_search_valid()
    tester.test_search_invalid_empty_keywords()
    tester.test_search_invalid_json()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   • {failure}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())