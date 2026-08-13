# Mythos App - Checklist QA manual

Esta checklist sirve para probar Mythos antes de una entrega, demo o despliegue. La idea es verificar los flujos principales como entrenador/dietista y como cliente.

## Antes de probar

- Confirmar que el backend arranca sin errores.
- Confirmar que el frontend arranca sin errores.
- Ejecutar las pruebas del backend.
- Ejecutar el lint y build del frontend.
- Crear datos demo si se necesita una presentacion rapida.
- Revisar que las variables de entorno esten configuradas en local y produccion.

## Autenticacion y cuenta

- Registrar un usuario nuevo.
- Iniciar sesion con el usuario creado.
- Cerrar sesion y volver a entrar.
- Solicitar recuperacion de contrasena.
- Confirmar que el email de recuperacion se envia si Resend esta configurado.
- Restablecer la contrasena con un token valido.
- Editar nombre, email y datos de perfil.
- Cambiar contrasena desde el perfil.
- Confirmar que una contrasena antigua no permite iniciar sesion despues del cambio.

## Flujo profesional

- Revisar el dashboard y sus indicadores principales.
- Comprobar alertas de clientes sin actividad o con baja adherencia.
- Crear un cliente nuevo.
- Asignar y desasignar clientes.
- Abrir el resumen de un cliente.
- Crear un plan de entrenamiento.
- Crear un plan de nutricion.
- Editar un plan existente.
- Eliminar un plan.
- Crear una sesion con fecha, hora, cliente y objetivo.
- Cambiar el estado de una sesion.
- Filtrar sesiones por estado o cliente.
- Enviar mensajes a un cliente desde el chat.
- Confirmar que los mensajes no leidos se reflejan correctamente.

## Flujo cliente

- Entrar con un usuario cliente.
- Ver los planes asignados.
- Registrar progreso corporal.
- Registrar entrenamientos completados.
- Registrar seguimiento de dieta.
- Editar un registro creado.
- Eliminar un registro creado.
- Revisar porcentaje de seguimiento de dieta.
- Revisar historial y filtros de progreso.
- Enviar mensajes al profesional desde el chat.

## API externa

- Buscar informacion nutricional desde la vista de nutricion.
- Confirmar que la app muestra un estado claro si la API externa no responde.
- Confirmar que los datos encontrados se pueden usar como apoyo para crear planes.

## Despliegue

- Confirmar que el backend esta desplegado y responde correctamente.
- Confirmar que el frontend apunta a la URL real del backend.
- Confirmar que CORS permite peticiones desde el dominio del frontend.
- Confirmar que la base de datos de produccion tiene las tablas creadas.
- Confirmar que las variables JWT, base de datos y email estan configuradas.
- Probar registro, login, dashboard y CRUD completo en produccion.

## Demo final

- Preparar un usuario profesional y al menos un cliente.
- Tener un plan de entrenamiento, un plan de nutricion y una sesion ya creados.
- Tener registros de progreso, entrenamiento y dieta para mostrar graficas/resumenes.
- Tener una conversacion de chat con mensajes leidos y no leidos.
- Mostrar el restablecimiento de contrasena como parte de seguridad.
- Mostrar la integracion nutricional como API de terceros.
