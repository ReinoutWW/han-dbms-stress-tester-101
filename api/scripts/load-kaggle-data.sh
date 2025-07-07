#!/bin/bash

# Script to load Kaggle data into MongoDB and Elasticsearch
# Usage: ./scripts/load-kaggle-data.sh

API_URL="${API_URL:-http://localhost:3000}"

echo "Loading Kaggle data into MongoDB and Elasticsearch..."
echo "API URL: $API_URL"
echo ""

# Make the API call to load data
curl -X POST "$API_URL/api/stress-test/load-kaggle-data" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 600 \
  --connect-timeout 10

echo ""
echo "Data loading request sent. Check API logs for progress."