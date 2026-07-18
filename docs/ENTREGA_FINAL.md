# Mythos App - Guia de entrega final

Esta guia resume lo necesario para presentar Mythos como proyecto final.

## Checklist de requisitos

- [x] Backend en Python.
- [x] Flask como framework.
- [x] SQLAlchemy como ORM.
- [x] JWT/cookies para autenticacion.
- [x] API REST propia.
- [x] Frontend en Next.js App Router.
- [x] React.
- [x] Tailwind CSS.
- [x] Registro de usuarios.
- [x] Login.
- [x] Recuperacion y restablecimiento de contrasena.
- [x] Contrasenas cifradas.
- [x] CRUD completo de planes.
- [x] Mas de tres vistas funcionales.
- [x] Integracion con servicio externo/API nutricional.
- [x] Preparacion de despliegue en Vercel + Render + PostgreSQL.
- [x] Datos demo.
- [x] Tests backend.
- [x] Build frontend validada.

## Vistas principales

- Home.
- Login.
- Registro.
- Recuperar contrasena.
- Restablecer contrasena.
- Dashboard.
- Clientes.
- Planes.
- Seguimiento.
- Nutricion.
- Agenda.
- Chat.
- Perfil.

## CRUD principal

CRUD de planes:

- Crear plan.
- Listar planes.
- Editar plan.
- Eliminar plan.
- Filtrar por estado, categoria y cliente.
- Gestionar bloques internos del plan.

CRUDs secundarios:

- Sesiones.
- Progreso.
- Entrenamientos.
- Dieta.
- Clientes asignados.

## Usuarios demo

```txt
Profesional:
coach@mythos.demo
password123

Cliente:
cliente@mythos.demo
password123
```

## Comandos de demo local

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
flask --app run.py db upgrade
flask --app run.py seed-demo
python run.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Comprobaciones antes de entregar

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

## Despliegue final recomendado

Frontend:

- Vercel.
- Root directory: `frontend`.
- Variable: `NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api`.

Backend:

- Render.
- Configuracion desde `render.yaml`.
- Base de datos PostgreSQL.
- Ejecutar migraciones tras desplegar.

Variables importantes en produccion:

```txt
SECRET_KEY
JWT_SECRET_KEY
DATABASE_URL
FRONTEND_URL
FRONTEND_URLS
ALLOW_RESET_TOKEN_RESPONSE=false
JWT_COOKIE_SAMESITE=None
JWT_COOKIE_SECURE=true
RESEND_API_KEY
MAIL_FROM
```

## Guion corto para presentacion

1. Explicar que Mythos conecta profesionales fitness/nutricion con clientes.
2. Mostrar registro/login.
3. Entrar como profesional.
4. Mostrar dashboard y alertas.
5. Abrir clientes y ficha agregada.
6. Crear o editar un plan.
7. Mostrar seguimiento con resumen y linea temporal.
8. Crear una sesion.
9. Enviar mensaje por chat.
10. Entrar como cliente y mostrar su experiencia.
11. Mostrar perfil y seguridad.

## Pendiente para uso real posterior

- Dominio real.
- Politica de privacidad.
- Terminos de uso.
- Email verificado en Resend.
- Monitorizacion de errores.
- Backups de base de datos.
- Notificaciones.
- Graficas avanzadas.
- Subida real de archivos/avatar.
