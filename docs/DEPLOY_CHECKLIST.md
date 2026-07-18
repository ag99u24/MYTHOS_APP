# Mythos App - Checklist de despliegue

Usa este checklist cuando vayas a publicar Mythos como proyecto final.

## 1. Preparar repositorio

- [ ] Confirmar que estas en la rama correcta (`alex` o `dev`).
- [ ] Confirmar que no hay cambios sin commit.
- [ ] Ejecutar pruebas backend.
- [ ] Ejecutar lint frontend.
- [ ] Ejecutar build frontend.
- [ ] Subir ultimos cambios a GitHub.

Comandos:

```bash
cd backend
python -m unittest discover -s tests

cd ../frontend
npm run lint
npm run build
```

## 2. Backend en Render

- [ ] Crear nuevo Blueprint o servicio usando `render.yaml`.
- [ ] Confirmar que Render detecta `rootDir: backend`.
- [ ] Confirmar que el servicio usa:

```txt
buildCommand: pip install -r requirements.txt
startCommand: gunicorn run:app
```

- [ ] Crear PostgreSQL en Render.
- [ ] Confirmar que `DATABASE_URL` se enlaza al servicio backend.

Variables en Render:

```txt
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

Despues del primer deploy:

```bash
flask --app run.py db upgrade
```

Opcional para demo:

```bash
flask --app run.py seed-demo
```

## 3. Frontend en Vercel

- [ ] Crear proyecto en Vercel desde el repositorio GitHub.
- [ ] Configurar root directory:

```txt
frontend
```

- [ ] Confirmar build command:

```bash
npm run build
```

- [ ] Configurar variable:

```txt
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api
```

- [ ] Desplegar.
- [ ] Copiar URL final de Vercel.
- [ ] Actualizar `FRONTEND_URL` y `FRONTEND_URLS` en Render con la URL real.
- [ ] Redeploy del backend tras actualizar CORS.

## 4. Email con Resend

- [ ] Crear cuenta en Resend.
- [ ] Crear API key.
- [ ] Verificar dominio o remitente.
- [ ] Configurar `RESEND_API_KEY` en Render.
- [ ] Configurar `MAIL_FROM` con remitente valido.
- [ ] Confirmar que `ALLOW_RESET_TOKEN_RESPONSE=false` en produccion.
- [ ] Probar recuperacion de contrasena desde la app desplegada.

## 5. Prueba final de la app desplegada

Profesional demo:

```txt
coach@mythos.demo
password123
```

Cliente demo:

```txt
cliente@mythos.demo
password123
```

Checklist funcional:

- [ ] Abrir frontend desplegado.
- [ ] Registrar usuario nuevo.
- [ ] Iniciar sesion.
- [ ] Recuperar contrasena.
- [ ] Entrar como profesional demo.
- [ ] Ver dashboard.
- [ ] Revisar clientes.
- [ ] Abrir ficha de cliente.
- [ ] Crear/editar plan.
- [ ] Crear sesion.
- [ ] Enviar mensaje por chat.
- [ ] Entrar como cliente demo.
- [ ] Registrar progreso.
- [ ] Registrar entrenamiento.
- [ ] Registrar dieta.
- [ ] Revisar historial de seguimiento.
- [ ] Editar perfil.
- [ ] Cambiar contrasena.

## 6. URLs finales

Completar antes de entregar:

```txt
Frontend:
Backend:
Repositorio:
```

## 7. Notas para la defensa

- Explicar que Mythos usa dos roles: profesional y cliente.
- Mostrar que el backend tiene API REST propia.
- Mostrar que las contrasenas estan cifradas.
- Mostrar recuperacion de contrasena por email.
- Mostrar CRUD completo de planes.
- Mostrar seguimiento, agenda y chat.
- Mencionar despliegue con Vercel, Render y PostgreSQL.
