# filepath: backend/app/main.py
from fastapi import FastAPI
from app.endpoints.todo import router as todo_router
from app.endpoints.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db

app = FastAPI()

# Initialize the database
init_db()

app.include_router(todo_router, prefix="/api", tags=["todos"])
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # ローカル開発環境
        "http://frontend:3000",   # Docker環境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}


