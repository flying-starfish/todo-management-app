# Todo Management App

A full-stack todo management application built with FastAPI (backend) and React (frontend).

> Practice React, FastAPI etc.

## 🏗️ Project Structure

```
todo-management-app/
├── backend/           # FastAPI backend
│   ├── app/          # Application code
│   ├── requirements.txt  # Python dependencies
│   └── todos.db      # SQLite database
├── frontend/         # React frontend
│   ├── src/          # React components
│   ├── package.json  # Node.js dependencies
│   └── public/       # Static assets
├── venv/            # Python virtual environment (ignored by Git)
└── README.md        # This file
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 16 or higher
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/flying-starfish/todo-management-app.git
cd todo-management-app
```

### 2. Set up Backend

```bash
cd backend
python -m venv ../venv
source ../venv/bin/activate  # On macOS/Linux
# ../venv/Scripts/activate   # On Windows
pip install -r requirements.txt
```

### 3. Set up Frontend

```bash
cd frontend
npm install
```

## 🏃‍♂️ Running the Application

### Start Backend Server

```bash
# Make sure you're in the project root and virtual environment is activated
source venv/bin/activate  # On macOS/Linux
cd backend
uvicorn app.main:app --reload
```

The backend will be available at: http://localhost:8000

### Start Frontend Development Server

```bash
# In a new terminal
cd frontend
npm start
```

The frontend will be available at: http://localhost:3000

## 📦 Dependencies

### Backend (Python)
- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations

### Frontend (React)
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Typed superset of JavaScript

## 🛠️ Development

### Backend Development
- API documentation is available at: http://localhost:8000/docs (Swagger UI)
- Database: SQLite (todos.db)
- Virtual environment is isolated in `venv/` directory

### Frontend Development
- Hot reload is enabled in development mode
- TypeScript is configured for type checking
- CSS modules are available for component styling

## 📝 API Endpoints

- `GET /todos` - Get all todos
- `POST /todos` - Create a new todo
- `PUT /todos/{id}` - Update a todo
- `DELETE /todos/{id}` - Delete a todo

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.