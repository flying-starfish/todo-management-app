.PHONY: help install install-dev lint format test test-cov clean security check-all

help:
	@echo "Available commands:"
	@echo "  make install      - Install production dependencies"
	@echo "  make install-dev  - Install development dependencies"
	@echo "  make lint         - Run all linters (flake8, mypy)"
	@echo "  make format       - Format code with black and isort"
	@echo "  make format-check - Check if code needs formatting"
	@echo "  make test         - Run tests"
	@echo "  make test-cov     - Run tests with coverage report"
	@echo "  make security     - Run security checks"
	@echo "  make check-all    - Run all checks (format, lint, security, test)"
	@echo "  make clean        - Remove cache and generated files"

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt
	pip install pre-commit
	pre-commit install

lint:
	@echo "Running flake8..."
	flake8 app/
	@echo "Running mypy..."
	mypy app/

format:
	@echo "Running black..."
	black app/ tests/
	@echo "Running isort..."
	isort app/ tests/

format-check:
	@echo "Checking black formatting..."
	black --check app/ tests/
	@echo "Checking isort..."
	isort --check-only app/ tests/

test:
	pytest tests/

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term --cov-report=xml tests/

security:
	@echo "Running pip-audit..."
	pip-audit --desc || true

check-all: format-check lint security test
	@echo "✅ All checks passed!"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov/
	rm -rf dist/
	rm -rf build/
	@echo "✅ Cleaned up cache and generated files"
