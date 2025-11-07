# Secure Banking Payment Portal

Monorepo containing the frontend React app and backend Node.js/Express API for a secure payment portal.

## Getting Started

Follow these quick steps to run both the backend API and the frontend locally.

### Prerequisites
- `Node.js` v18+ and `npm` v9+
- A Firebase project with Admin SDK credentials
- A running MongoDB instance (local or hosted)

### 1) Clone the Repository
```bash
git clone <your-repo-url>
cd Payment Portal
```

### 2) Backend Setup
```bash
cd Backend
cp .env.example .env
# Edit .env with your Firebase and security secrets
npm install
npm run dev
```
- Default API port: `5001`
- Health check: `http://localhost:5001/health`
- Full guide: `Backend/README.md`

### 3) Frontend Setup
```bash
cd ../Frontend
cp .env.example .env
# Set backend URL in .env (see Frontend/.env.example)
# e.g. REACT_APP_API_BASE_URL=http://localhost:5001
npm install
npm start
```
- Default app port: `3000`
- Full guide: `Frontend/README.md`

### 4) Verify End-to-End
- Open `http://localhost:3000`
- Ensure the frontend can reach the backend at `http://localhost:5001`
- Check backend logs for Firebase and MongoDB connection success

## Project Structure
```
Payment Portal/
├── Backend/   # Node.js/Express API (Firebase, MongoDB, security)
└── Frontend/  # React app (UI, services)
```

## Documentation
- Backend setup and security details: `Backend/README.md`
- Frontend setup and environment details: `Frontend/README.md`

## Security Notes
- Do not commit `.env` files or secrets
- Use different credentials for development and production
- Keep `ALLOWED_ORIGINS` and CORS settings aligned with your deployment