.PHONY: help install lint lint-fix format format-check type-check test test-cov check-all clean

help:
	@echo "Frontend Development Commands:"
	@echo "  make install       - Install all dependencies"
	@echo "  make lint          - Run ESLint"
	@echo "  make lint-fix      - Run ESLint with auto-fix"
	@echo "  make format        - Format code with Prettier"
	@echo "  make format-check  - Check code formatting"
	@echo "  make type-check    - Run TypeScript type checking"
	@echo "  make test          - Run tests"
	@echo "  make test-cov      - Run tests with coverage"
	@echo "  make check-all     - Run all checks (format, lint, type, test)"
	@echo "  make clean         - Clean build artifacts and dependencies"

install:
	npm install

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

format-check:
	npm run format:check

type-check:
	npm run type-check

test:
	npm test -- --watchAll=false

test-cov:
	npm test -- --coverage --watchAll=false

check-all: format-check lint type-check test
	@echo "✅ All frontend checks passed!"

clean:
	rm -rf node_modules build coverage
	@echo "✅ Cleaned frontend artifacts"
