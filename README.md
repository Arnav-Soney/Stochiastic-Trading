# Stochastic Trading Platform

A high-performance algorithmic trading platform with real-time market data analysis, stochastic modeling, and AI-powered trading strategies.

## 🚀 Features

- **Real-time Market Data**: Live order book caching with sub-millisecond latency using Redis
- **Stochastic Models**: Advanced quantitative models for intraday trading
- **AI-Powered Engine**: Machine learning algorithms for trade prediction and optimization
- **Interactive Charts**: Beautiful data visualization using lightweight-charts
- **Modern UI**: Responsive interface built with React, TypeScript, and Tailwind CSS
- **Event-Driven Architecture**: Kafka-based messaging with Redpanda for scalable trade execution
- **Portfolio Management**: PostgreSQL-backed user profiles and historical trade tracking

## 🛠️ Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lightweight Charts** - Professional trading charts
- **React Router** - Client-side routing

### Backend

- **Python** - Core trading algorithms and AI engine
- **FastAPI/Flask** (via main.py) - REST API server

### Infrastructure

- **PostgreSQL 15** - User profiles, portfolios, and trade history
- **Redis 7** - Sub-millisecond order book caching and real-time pricing
- **Redpanda** - Kafka-compatible message streaming (no Zookeeper required)
- **Docker Compose** - Containerized development environment

## 📋 Prerequisites

- **Node.js** 18+ and **pnpm**
- **Python** 3.9+
- **Docker** and **Docker Compose**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Stochiastic-Trading
```

### 2. Install Frontend Dependencies

```bash
pnpm install
```

### 3. Install Backend Dependencies

```bash
cd server
pip install -r requirements.txt  # Create requirements.txt if needed
cd ..
```

### 4. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
POSTGRES_USER=stoch_admin
POSTGRES_PASSWORD=stoch_password
POSTGRES_DB=stoch_trading
DATABASE_URL=postgresql://stoch_admin:stoch_password@localhost:5432/stoch_trading

# Redis
REDIS_URL=redis://localhost:6379

# Kafka/Redpanda
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# API
API_PORT=8000
```

### 5. Start Infrastructure Services

```bash
docker-compose up -d
```

This will start:

- PostgreSQL on port `5432`
- Redis on port `6379`
- Redpanda (Kafka) on ports `9092`, `29092`, `8082`, `9644`

### 6. Start Backend Server

```bash
cd server
python main.py
```

The API server will run on `http://localhost:8000`

### 7. Start Frontend Development Server

```bash
pnpm dev
```

The frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
Stochiastic-Trading/
├── .github/
│   └── workflows/         # CI/CD workflows
│       ├── ci.yml         # Main CI pipeline
│       ├── frontend-lint.yml  # Frontend linting
│       └── backend-lint.yml   # Backend linting
├── src/                   # Frontend React application
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── server/               # Backend Python server
│   ├── main.py          # FastAPI/Flask server entry point
│   ├── ai_engine.py     # AI/ML trading algorithms
│   ├── quant_models.py  # Quantitative trading models
│   └── intraday_models.py # Intraday trading strategies
├── public/              # Static assets
├── docker-compose.yml   # Infrastructure services
├── package.json         # Frontend dependencies
├── pyproject.toml       # Python project configuration
├── .flake8             # Flake8 linting configuration
└── README.md           # This file
```

## 🐳 Docker Services

### PostgreSQL

- **Container**: `stoch_postgres`
- **Port**: `5432`
- **Database**: `stoch_trading`
- **User**: `stoch_admin`

### Redis

- **Container**: `stoch_redis`
- **Port**: `6379`
- **Purpose**: Order book caching, real-time pricing

### Redpanda (Kafka)

- **Container**: `stoch_kafka`
- **Ports**:
  - `9092` - External Kafka API
  - `29092` - Internal Kafka API
  - `8082` - Pandaproxy API
  - `9644` - Admin API

## 📜 Available Scripts

### Frontend

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm lint       # Run ESLint
```

### Backend

```bash
# Run linters locally
black server/              # Format code
isort server/              # Sort imports
flake8 server/             # Lint code
pylint server/             # Advanced linting
mypy server/               # Type checking
```

### Docker

```bash
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose logs -f      # View logs
docker-compose ps           # Check service status
```

## 🔄 CI/CD Pipeline

This project includes automated GitHub Actions workflows for code quality:

### Main CI Pipeline (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches:

- **Frontend Checks**: ESLint, TypeScript type checking, and build validation
- **Backend Checks**: Black formatting, isort import sorting, and Flake8 linting
- **Docker Validation**: Validates `docker-compose.yml` configuration

### Frontend Linting (`frontend-lint.yml`)

- Runs ESLint on TypeScript/React code
- Performs TypeScript type checking
- Triggers only on frontend file changes

### Backend Linting (`backend-lint.yml`)

- **Black**: Code formatting validation
- **isort**: Import statement sorting
- **Flake8**: PEP 8 style guide enforcement
- **Pylint**: Advanced code analysis
- **MyPy**: Static type checking
- Triggers only on Python file changes

### Linter Configurations

#### Python Linters

Configuration is managed in [`pyproject.toml`](pyproject.toml:1) and [`.flake8`](.flake8:1):

- **Line length**: 127 characters
- **Target Python**: 3.11+
- **Black profile**: Applied to all formatters
- **Ignore rules**: Compatible with Black formatting

### Running Linters Locally

To run all linters before pushing code:

```bash
# Run all linters at once
./scripts/lint-all.sh

# Or run individually:

# Frontend
pnpm lint
pnpm exec tsc --noEmit

# Backend
cd server
black .
isort .
flake8 .
pylint .
mypy .
```

## 🔧 Development

### Stop Process on Port 8000

If you need to stop the backend server:

```bash
# Find process on port 8000
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)
```

### Database Migrations

```bash
# Access PostgreSQL
docker exec -it stoch_postgres psql -U stoch_admin -d stoch_trading
```

### Redis CLI

```bash
# Access Redis
docker exec -it stoch_redis redis-cli
```

### Code Quality

#### Frontend

```bash
# Lint and fix
pnpm lint

# Type check
pnpm exec tsc --noEmit
```

#### Backend

```bash
# Format code
black server/

# Sort imports
isort server/

# Lint
flake8 server/

# Advanced linting
pylint server/

# Type check
mypy server/
```

## 📊 Trading Models

- **Intraday Models**: Short-term trading strategies
- **Quant Models**: Quantitative analysis and backtesting
- **AI Engine**: Machine learning-based prediction models

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow ESLint rules for frontend code
- Use Black, isort, and Flake8 for Python code
- Ensure all tests pass before submitting PR
- All CI checks must pass

## 📝 License

This project is private and proprietary.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading involves substantial risk of loss. Always do your own research before making any trading decisions.
