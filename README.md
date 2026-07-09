# Mythos App

Mythos conecta entrenadores y dietistas con sus clientes para gestionar planes, seguimiento y progreso.

## Stack

- Backend: Python, Flask, SQLAlchemy, JWT, API REST.
- Frontend: Next.js App Router, React, Tailwind CSS.

## Desarrollo local

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
flask --app run.py init-db
python run.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

URLs locales:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/health

Si usas Codespaces, arranca el frontend con:

```bash
npm run dev -- --host 0.0.0.0
```
