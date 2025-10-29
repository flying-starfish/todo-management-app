# Backend Setup Guide

## 🐍 Python Environment Setup

### 1. Create Virtual Environment

```bash
# From the project root directory
python -m venv venv
```

### 2. Activate Virtual Environment

**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Verify Installation

```bash
python -c "import fastapi; print('FastAPI installed successfully')"
```

## 🚀 Running the Backend

### Development Server

```bash
# Make sure virtual environment is activated
cd backend
uvicorn app.main:app --reload
```

### Production Server

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📊 Database

- **Type**: SQLite
- **File**: `todos.db`
- **Location**: `backend/todos.db`

The database is automatically created when you first run the application.

## 🧪 Testing the API

### Using Browser
Visit: http://localhost:8000/docs for Swagger UI

### Using curl
```bash
# Get all todos
curl http://localhost:8000/todos

# Create a new todo
curl -X POST http://localhost:8000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Todo", "description": "This is a test"}'
```

## 🔧 Development Tools

### Code Formatting
```bash
pip install black
black .
```

### Linting
```bash
pip install flake8
flake8 .
```

## 📦 Adding New Dependencies

1. Install the package: `pip install <package-name>`
2. Update requirements.txt: `pip freeze > requirements.txt`
3. Commit the updated requirements.txt

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Change port with `--port 8001`
2. **Import errors**: Make sure virtual environment is activated
3. **Database issues**: Delete `todos.db` to reset database
