# AI Price Suggestion Microservice

This microservice provides price suggestions for new listings on the GT Marketplace app using a machine learning model trained on historical listing data.

## Features
- REST API endpoint to get a price suggestion based on title, description, and category.
- Easily deployable as a standalone Python (FastAPI) service.

## How to Run
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

## API Usage
- **Endpoint:** `/suggest_price`
- **Method:** `POST`
- **Request JSON:**
  ```json
  {
    "title": "iPhone 12",
    "description": "Good condition, 64GB, unlocked.",
    "category": "Electronics"
  }
  ```
- **Response JSON:**
  ```json
  {
    "suggested_price": 299.99
  }
  ```

## Model
- The initial version uses a simple heuristic or dummy model. Replace `model.py` with your own ML model for production.

--- 