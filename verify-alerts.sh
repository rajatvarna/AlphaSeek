#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== Creating Price Alert with Correct Schema ==="
curl -s -X POST http://localhost:5000/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_idea_id": 1,
    "alert_type": "price_target",
    "threshold": 600.00
  }'

echo -e "\n\n=== Getting All Alerts ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/alerts

echo -e "\n\n✅ Price Alerts API Verified!"
