# ============================================================
# GramUdyam AI — Developer shortcuts
# Usage: make <target>
# Requires: Python 3.11+, Node.js 20+, make
# ============================================================

.PHONY: help install install-api install-web dev dev-api dev-web \
        build test test-api test-web migrate lint clean

# Default: show help
help:
	@echo ""
	@echo "  GramUdyam AI — available targets"
	@echo ""
	@echo "  Setup"
	@echo "    make install        Install all dependencies (api + web)"
	@echo "    make install-api    Install Python backend dependencies"
	@echo "    make install-web    Install Node.js frontend dependencies"
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start both servers concurrently"
	@echo "    make dev-api        Start FastAPI backend only  (port 8000)"
	@echo "    make dev-web        Start React frontend only   (port 5173)"
	@echo ""
	@echo "  Database"
	@echo "    make migrate        Run alembic upgrade head"
	@echo ""
	@echo "  Testing"
	@echo "    make test           Run all tests"
	@echo "    make test-api       Run pytest (backend)"
	@echo "    make test-web       Run vitest (frontend)"
	@echo ""
	@echo "  Build & Deploy"
	@echo "    make build          Build frontend for production"
	@echo ""
	@echo "  Maintenance"
	@echo "    make lint           Lint both api and web"
	@echo "    make clean          Remove build artefacts and caches"
	@echo ""

# ── Setup ────────────────────────────────────────────────────
install: install-api install-web

install-api:
	cd api && pip install -r requirements.txt

install-web:
	cd web && npm install

# ── Development ──────────────────────────────────────────────
dev:
	@echo "Starting api on :8000 and web on :5173 ..."
	@start /B cmd /c "cd api && uvicorn app.main:app --reload --port 8000"
	@cd web && npm run dev

dev-api:
	cd api && uvicorn app.main:app --reload --port 8000

dev-web:
	cd web && npm run dev

# ── Database ─────────────────────────────────────────────────
migrate:
	cd api && alembic upgrade head

# ── Testing ──────────────────────────────────────────────────
test: test-api test-web

test-api:
	cd api && pytest tests/ -v

test-web:
	cd web && npm run test

# ── Build ────────────────────────────────────────────────────
build:
	cd web && npm run build

# ── Lint ─────────────────────────────────────────────────────
lint:
	cd web && npm run lint

# ── Clean ────────────────────────────────────────────────────
clean:
	cd web && rm -rf dist node_modules/.cache
	find api -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find api -name "*.pyc" -delete 2>/dev/null || true
