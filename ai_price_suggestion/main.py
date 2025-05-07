from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import suggest_price

app = FastAPI()

# Enable CORS for all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PriceRequest(BaseModel):
    title: str
    description: str
    category: str

class PriceResponse(BaseModel):
    suggested_price: float

@app.post('/suggest_price', response_model=PriceResponse)
def get_price(req: PriceRequest):
    price = suggest_price(req.title, req.description, req.category)
    return PriceResponse(suggested_price=price) 