# AI Daily Copilot

AI Daily Copilot is a web-based business management application designed to help small businesses monitor sales, manage inventory, analyze transactions, forecast product demand, and receive AI-assisted business insights from one dashboard.

The project combines traditional business analytics with a local AI assistant powered by **Ollama and Qwen 2.5 7B**.

---

## Features

### Dashboard

The dashboard provides a quick overview of business performance, including:

- Daily revenue
- Daily transaction count
- Low-stock products
- Best-selling products
- Revenue trends
- AI-generated business insights
- Quick access to core business modules

### AI Copilot

AI Copilot is an integrated business assistant that can answer questions based on business data.

Example questions:

- What is my best-selling product?
- Which products are running low on stock?
- How are sales performing this week?
- What should I pay attention to today?

The Copilot uses business context from the application and sends it to a local LLM through the FastAPI AI service.

Current local model:

```text
qwen2.5:7b
```

The model is served using Ollama.

### Transaction History & Sales Analytics

The transaction module provides:

- Transaction history
- Date-range filtering
- Transaction pagination
- Revenue summaries
- Total transactions
- Total items sold
- Average transaction value
- Revenue trends
- Product sales analytics

Main API endpoints:

```text
GET /api/transactions
GET /api/transactions/summary
GET /api/transactions/analytics
```

### Inventory Management

Inventory features include:

- Product stock monitoring
- Minimum stock tracking
- Low-stock detection
- Inventory adjustment
- Inventory history

### Product Management

Product management supports:

- Creating products
- Updating products
- Product SKU
- Product categories
- Selling prices
- Stock information
- Active/inactive product status

### Receipt & Data Import

Business data can be imported through the import workflow.

The project currently supports receipt processing through the AI service and product matching workflow.

Receipt extraction can use Gemini for document understanding.

### Sales Forecasting

The forecasting module analyzes historical sales data to estimate future product demand.

The AI service includes forecasting dependencies such as:

- pandas
- NumPy
- scikit-learn
- statsmodels
- pmdarima

Forecasting requires sufficient historical transaction data for the selected product.

---

## Tech Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React

### Backend & Database

- Next.js API Routes
- Supabase
- PostgreSQL
- Supabase Authentication

### AI Service

- Python
- FastAPI
- Uvicorn
- Ollama
- Qwen 2.5 7B
- Gemini API
- scikit-learn
- statsmodels
- pmdarima

### Development

- Docker
- Supabase CLI
- npm
- Python virtual environment / Conda

---

## Project Architecture

```text
ai-daily-copilot/
│
├── ai-service/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── web/
│   ├── app/
│   │   ├── (app)/
│   │   └── api/
│   │
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── supabase/
│
├── scripts/
│   └── dev.js
│
├── package.json
└── README.md
```

The application is divided into three main layers:

```text
Next.js Frontend
       │
       ▼
Next.js API Routes
       │
       ├──────────────► Supabase / PostgreSQL
       │
       ▼
FastAPI AI Service
       │
       ├──────────────► Ollama / Qwen 2.5 7B
       │
       └──────────────► Gemini API
```

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Python
- Docker Desktop
- Supabase CLI
- Ollama

Make sure Docker Desktop is running before starting the application.

---

## Clone the Repository

```bash
git clone <https://github.com/Yosef0110/ai-daily-copilot/tree/main/web>
cd ai-daily-copilot
```

---

## Python Environment

Using Conda is recommended.

```bash
conda create -n aicopilot python=3.12
conda activate aicopilot
```

Python dependencies are automatically checked when the development environment starts.

They can also be installed manually:

```bash
pip install -r ai-service/requirements.txt
```

---

## Environment Variables

Create:

```text
ai-service/.env
```

For Gemini-powered functionality:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Multiple Gemini API keys can optionally be configured:

```env
GEMINI_API_KEYS=key_1,key_2,key_3
```

Never commit API keys or `.env` files to Git.

The Next.js local environment is prepared by the development startup script when required.

---

## Ollama

Install Ollama and make sure its service is running.

The project currently uses:

```text
qwen2.5:7b
```

You can manually install the model with:

```bash
ollama pull qwen2.5:7b
```

The development startup script checks whether Ollama and the required model are available.

---

## Running the Application

From the project root:

```bash
npm run dev
```

The development script automatically checks the main local dependencies and services required by the project.

It will:

1. Check/install root Node dependencies
2. Check/install web dependencies
3. Detect Python
4. Check Python requirements
5. Check Docker
6. Start/check local Supabase
7. Prepare local environment variables
8. Check Ollama
9. Check the Qwen 2.5 7B model
10. Start Next.js
11. Start FastAPI

After startup:

```text
Next.js
http://localhost:3000

FastAPI
http://127.0.0.1:8000

FastAPI Docs
http://127.0.0.1:8000/docs

Supabase Studio
http://127.0.0.1:54323
```

---

## AI Service Health Check

The FastAPI service provides:

```text
GET /health
```

Open:

```text
http://127.0.0.1:8000/health
```

This can be used to verify that the AI service is running and whether Gemini credentials were detected.

---

## Main Pages

```text
/dashboard
/products
/inventory
/imports
/transactions
/forecast
```

---

## Current MVP

The current MVP focuses on:

- Authentication
- Product management
- Inventory management
- Receipt/data import
- Transaction history
- Sales analytics
- Sales forecasting
- Business dashboard
- AI-generated insights
- AI Copilot
- Local development automation

---

## Future Improvements

Potential future development includes:

- More advanced AI business recommendations
- Conversational memory for AI Copilot
- Richer business context for the LLM
- Improved receipt extraction
- Forecast accuracy evaluation
- Additional forecasting models
- Dashboard customization
- Automated business alerts
- Improved transaction analytics
- Production deployment architecture
- Role-based access control
- AI-generated daily business reports

---

## Security

Do not commit:

```text
.env
.env.local
API keys
Supabase secret keys
credentials
```

Only example environment files without real credentials should be committed.

---

## Project Status

**MVP — Active Development**

The project is currently being developed and tested locally. Features and architecture may change as development continues.