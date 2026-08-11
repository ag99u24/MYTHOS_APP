# Configurar correo de recuperacion con Resend

Mythos ya tiene implementado el flujo de recuperacion de contrasena:

1. El usuario solicita recuperar contrasena desde `/forgot-password`.
2. El backend crea un token temporal.
3. Resend envia un enlace hacia `/reset-password?token=...`.
4. El usuario define una nueva contrasena.
5. El token queda usado y no se puede reutilizar.

## Variables necesarias

En DigitalOcean App Platform configura estas variables en el backend:

```txt
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
MAIL_FROM=Mythos <noreply@tudominio.com>
FRONTEND_URL=https://tu-frontend.netlify.app
FRONTEND_URLS=https://tu-frontend.netlify.app
ALLOW_RESET_TOKEN_RESPONSE=false
```

## Resend

Para enviar correos reales necesitas:

1. Crear una cuenta en Resend.
2. Verificar un dominio propio o usar el dominio de pruebas si Resend lo permite para tu cuenta.
3. Crear una API key.
4. Copiar la API key en `RESEND_API_KEY`.
5. Usar un remitente valido en `MAIL_FROM`.

Ejemplo con dominio propio:

```txt
MAIL_FROM=Mythos <noreply@mythosapp.com>
```

## Prueba manual

1. Despliega backend y frontend.
2. Registra un usuario real con un email al que tengas acceso.
3. Ve a `/forgot-password`.
4. Escribe ese email.
5. Revisa la bandeja de entrada.
6. Abre el enlace.
7. Define una nueva contrasena.
8. Comprueba que puedes iniciar sesion con la nueva contrasena.

En produccion no debe aparecer el token temporal en pantalla. Para eso `ALLOW_RESET_TOKEN_RESPONSE` debe estar en `false`.
