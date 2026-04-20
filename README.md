# 📈 Trendcast: Intelligent Sales Forecasting & Analytics

Trendcast is a high-performance web application designed to provide actionable insights and accurate sales predictions. Built with a modern full-stack architecture, it empowers businesses to visualize historical trends and forecast future performance using advanced time-series models.

---

## ✨ Key Features

- **📊 Interactive Dashboards**: Comprehensive visualization of sales data using dynamic charts (Chart.js & Recharts).
- **🔮 Advanced Forecasting**: Leverages **SARIMA** and **Exponential Smoothing** models to predict future sales trends.
- **📁 Dataset Management**: Seamlessly upload and manage sales data (CSV/JSON) for analysis.
- **🔐 Secure Authentication**: Robust JWT-based authentication system with secure password hashing.
- **⚡ Real-time Analytics**: Instant processing and visualization of large datasets.
- **📱 Responsive Design**: Fully optimized for a seamless experience across desktop and mobile devices.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Chart.js](https://www.chartjs.org/) & [Recharts](https://recharts.org/)
- **Routing**: [Wouter](https://github.com/molecula/wouter)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Async with [Motor](https://motor.readthedocs.io/))
- **Data Science**: [Pandas](https://pandas.pydata.org/), [Scikit-learn](https://scikit-learn.org/), [Statsmodels](https://www.statsmodels.org/)
- **Auth**: JWT (Jose), Bcrypt

---

## 📁 Project Structure

```text
Trendcast/
├── backend/            # FastAPI Server & Data Science Logic
│   ├── api/            # API Routes, Database Models & Auth
│   ├── main.py         # Application Entry Point
│   └── requirements.txt# Python Dependencies
├── src/                # React Frontend
│   ├── page/           # Page Components (Dashboard, Forecasts, etc.)
│   ├── ui/             # Reusable UI Components
│   └── main.jsx        # Frontend Entry Point
├── public/             # Static Assets
└── package.json        # Frontend Dependencies & Scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Instance

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file and add:
# MONGODB_URI=your_mongodb_connection_string
# SECRET_KEY=your_secure_secret_key

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Navigate to root directory
npm install

# Start development server
npm run dev
```

---

## 🌐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `SECRET_KEY` | Secret key for JWT signing |
| `ALGORITHM` | JWT algorithm (default: HS256) |

### Frontend (`.env.local`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL of the FastAPI backend (default: http://localhost:8000) |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
