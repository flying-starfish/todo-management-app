# filepath: backend/app/main.py
from fastapi import FastAPI
from app.endpoints.todo import router as todo_router
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db

app = FastAPI()

# Initialize the database
init_db()

app.include_router(todo_router, prefix="/api", tags=["todos"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React の URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}


