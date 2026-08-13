# Despliegue: Netlify + DigitalOcean + Cloudflare

## Arquitectura

- Frontend: Netlify, usando la carpeta `frontend`.
- Backend/API: DigitalOcean App Platform, usando `digitalocean-app.yaml`.
- Base de datos: PostgreSQL en DigitalOcean.
- Dominio, DNS y proteccion: Cloudflare.

## 1. Backend en DigitalOcean

1. En DigitalOcean, crea una App desde GitHub.
2. Usa el spec `digitalocean-app.yaml`.
3. Rama: `alex`.
4. Antes del primer deploy, cambia estos valores:

```txt
SECRET_KEY
JWT_SECRET_KEY
FRONTEND_URL
FRONTEND_URLS
RESEND_API_KEY
MAIL_FROM
```

El backend arranca con:

```bash
flask --app run.py db upgrade && gunicorn --bind 0.0.0.0:8080 run:app
```

Cuando termine el deploy, comprueba:

```txt
https://TU-BACKEND.ondigitalocean.app/api/health
```

## 2. Frontend en Netlify

1. En Netlify, importa el repo desde GitHub.
2. Usa la rama `alex`.
3. Netlify puede leer `netlify.toml` desde la raiz.
4. Configura la variable:

```txt
NEXT_PUBLIC_API_URL=https://TU-BACKEND.ondigitalocean.app/api
```

5. Deploy.

## 3. CORS final

Cuando Netlify genere la URL final, vuelve a DigitalOcean y actualiza:

```txt
FRONTEND_URL=https://TU-FRONTEND.netlify.app
FRONTEND_URLS=https://TU-FRONTEND.netlify.app
```

Redeploy del backend.

## 4. Cloudflare

Si usas dominio propio:

1. Agrega el dominio a Cloudflare.
2. Cambia los nameservers del dominio por los de Cloudflare.
3. Crea estos registros:

```txt
app      CNAME  TU-FRONTEND.netlify.app
api      CNAME  TU-BACKEND.ondigitalocean.app
```

Para trafico web, Cloudflare recomienda usar registros proxied cuando sea compatible. Si Netlify o DigitalOcean necesitan verificar el dominio con CNAME/TXT, deja esos registros en DNS only hasta terminar la verificacion.

Despues actualiza:

```txt
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
FRONTEND_URL=https://app.tudominio.com
FRONTEND_URLS=https://app.tudominio.com
```
