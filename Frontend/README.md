# Payment Portal Frontend — Install & Run

This README focuses only on how to install and run the frontend, and how to point it to the backend.

## Prerequisites
- Node.js v16+ and npm v8+
- Backend API running locally (see Backend README)

## Install
```bash
cd Frontend
npm install
```

## Configure
Create an environment file and set the backend URL:
```bash
cp .env.example .env
```
Edit `.env` and set:
```env
REACT_APP_API_BASE_URL=http://localhost:5002
```

## Run (Development)
- Default (port 3000):
```bash
npm start
```
- Custom port 3001 pointing to backend on 5002:
```bash
PORT=3001 REACT_APP_API_BASE_URL=http://localhost:5002 npm start
```

Open the app at `http://localhost:3000/` or `http://localhost:3001/` depending on the command used.

## Notes
- Ensure backend CORS allows the frontend origin you’re using (e.g., `http://localhost:3000` or `http://localhost:3001`).
- If changing ports, update `REACT_APP_API_BASE_URL` accordingly.