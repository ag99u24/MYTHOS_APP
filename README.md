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

## Despliegue

Arquitectura recomendada:

- Frontend: Vercel.
- Backend: Render.
- Base de datos: PostgreSQL en Render.

### Backend en Render

El backend incluye:

- `backend/Procfile`
- `backend/runtime.txt`
- `render.yaml`
- `gunicorn`
- soporte para `DATABASE_URL` de PostgreSQL

Variables necesarias:

```txt
SECRET_KEY
JWT_SECRET_KEY
DATABASE_URL
FRONTEND_URL
```

Despues de desplegar el backend, inicializa las tablas:

```bash
flask --app run.py init-db
```

### Frontend en Vercel

Configura el proyecto apuntando a la carpeta:

```txt
frontend
```

Variable necesaria:

```txt
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api
```

El frontend incluye `frontend/vercel.json` y usa:

```bash
npm run build
```
