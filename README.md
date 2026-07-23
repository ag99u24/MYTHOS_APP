# Mythos App

Mythos es una aplicacion web para conectar entrenadores y dietistas con sus clientes. Permite gestionar clientes, crear planes, registrar progreso, controlar adherencia de dieta, agendar sesiones y mantener comunicacion por chat.

## Objetivo

El proyecto esta pensado como una plataforma de seguimiento profesional-cliente inspirada en herramientas como Harbiz. El profesional puede centralizar planes y revision del avance; el cliente puede registrar su dia a dia y comunicarse con su entrenador o dietista.

## Stack

Backend:

- Python.
- Flask.
- SQLAlchemy.
- Flask-Migrate.
- Flask-JWT-Extended.
- API REST.
- PostgreSQL en produccion.

Frontend:

- Next.js con App Router.
- React.
- Tailwind CSS.
- TypeScript.

Servicios externos:

- Resend para envio de email de recuperacion de contrasena.
- API nutricional para busqueda de alimentos.

## Funcionalidades principales

- Registro e inicio de sesion.
- JWT/cookies para autenticacion.
- Contrasenas cifradas.
- Recuperacion y restablecimiento de contrasena.
- Cambio de contrasena desde perfil.
- Edicion de perfil, email, avatar, especialidad y objetivo.
- Roles: profesional y cliente.
- Asignacion y desasignacion de clientes.
- Ficha agregada de cliente.
- CRUD completo de planes.
- Bloques dentro de planes.
- Filtros de planes por estado, categoria y cliente.
- Registro de progreso corporal.
- Registro de entrenamientos.
- Registro de dieta y porcentaje de adherencia.
- Resumen de seguimiento y linea temporal filtrable.
- Gestion de sesiones con estados.
- Chat profesional-cliente.
- Mensajes leidos/no leidos.
- Dashboard con metricas y alertas de atencion.
- Datos demo para presentacion.

## Estructura

```txt
backend/
  app/
  migrations/
  tests/
  run.py
frontend/
  src/
  package.json
render.yaml
README.md
```

## Desarrollo local

### Backend

```bash
cd backend
cp .env.example .env
python -m pip install -r requirements.txt
flask --app run.py db upgrade
flask --app run.py seed-demo
python run.py
```

Backend local:

```txt
http://localhost:5000/api/health
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend local:

```txt
http://localhost:3000
```

Si usas Codespaces:

```bash
npm run dev -- --host 0.0.0.0
```

## Credenciales demo

```txt
Profesional:
Email: coach@mythos.demo
Password: password123

Cliente:
Email: cliente@mythos.demo
Password: password123
```

Para regenerar datos demo:

```bash
cd backend
flask --app run.py seed-demo
```

## Variables de entorno

Backend local (`backend/.env`):

```txt
APP_ENV=development
SECRET_KEY=replace-me-with-a-long-random-secret
JWT_SECRET_KEY=replace-me-with-a-different-long-random-secret
DATABASE_URL=sqlite:///mythos.db
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://localhost:3002
ALLOW_RESET_TOKEN_RESPONSE=true
JWT_COOKIE_SAMESITE=Lax
JWT_COOKIE_SECURE=false
RESEND_API_KEY=
MAIL_FROM=Mythos <onboarding@resend.dev>
```

Frontend local (`frontend/.env.local`):

```txt
NEXT_PUBLIC_API_URL=http://localhost:5000/api
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

El proyecto incluye GitHub Actions en `.github/workflows/ci.yml` para ejecutar comprobaciones en `alex`, `dev`, `main` y pull requests.

## Despliegue

Arquitectura recomendada para el proyecto final:

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

Variables necesarias en Render:

```txt
APP_ENV=production
SECRET_KEY
JWT_SECRET_KEY
DATABASE_URL
FRONTEND_URL=https://tu-frontend.vercel.app
FRONTEND_URLS=https://tu-frontend.vercel.app
ALLOW_RESET_TOKEN_RESPONSE=false
JWT_COOKIE_SAMESITE=None
JWT_COOKIE_SECURE=true
RESEND_API_KEY
MAIL_FROM=Mythos <tu-email-verificado@tudominio.com>
```

Con `APP_ENV=production`, el backend no arranca si los secretos siguen siendo valores de ejemplo, si las cookies no son seguras o si `ALLOW_RESET_TOKEN_RESPONSE` esta activo.

Despues de desplegar el backend, aplica migraciones:

```bash
flask --app run.py db upgrade
```

Comprueba que el backend esta vivo y conectado a la base de datos:

```txt
https://tu-backend.onrender.com/api/health
```

Si quieres cargar demo en produccion para la defensa:

```bash
flask --app run.py seed-demo
```

### Frontend en Vercel

Configura Vercel apuntando a la carpeta:

```txt
frontend
```

Variable necesaria en Vercel:

```txt
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api
```

Build command:

```bash
npm run build
```

## Flujo recomendado para la demo

1. Entrar como profesional.
2. Ver dashboard y alertas.
3. Abrir clientes y revisar ficha de cliente.
4. Crear o revisar un plan.
5. Ir a seguimiento y ver resumen/historial.
6. Crear una sesion en agenda.
7. Enviar mensaje por chat.
8. Entrar como cliente y comprobar planes, seguimiento, sesiones y chat.
9. Probar perfil, cambio de email y cambio de contrasena.

## Estado del proyecto final

Mythos cumple los requisitos principales del proyecto:

- Buen diseno base y estructura visual consistente.
- Registro, login y recuperacion de contrasena.
- Contrasenas cifradas.
- API REST propia.
- CRUD completo.
- Mas de tres vistas funcionales.
- Integracion con API/servicios externos.
- Preparado para despliegue en produccion.

Queda pendiente para uso real posterior:

- Configurar dominios reales.
- Activar email verificado en Resend.
- Revisar datos legales/privacidad.
- Mejorar notificaciones.
- Anadir graficas avanzadas.
- Pulir responsive final en dispositivos reales.
