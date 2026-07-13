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
flask --app run.py db upgrade
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

## Calidad

Backend:

```bash
cd backend
python -m unittest discover -s tests
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

El proyecto incluye GitHub Actions en `.github/workflows/ci.yml` para ejecutar estas comprobaciones en `alex`, `dev`, `main` y pull requests.

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
FRONTEND_URLS=https://tu-frontend.vercel.app,https://preview.vercel.app
ALLOW_RESET_TOKEN_RESPONSE=false
JWT_COOKIE_SAMESITE=None
JWT_COOKIE_SECURE=true
RESEND_API_KEY
MAIL_FROM=Mythos <onboarding@resend.dev>
```

Para recuperar contrasena por email, crea una API key en Resend y guardala como `RESEND_API_KEY`.
En produccion, usa un remitente verificado en `MAIL_FROM`.

Despues de desplegar el backend, aplica las migraciones:

```bash
flask --app run.py db upgrade
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
