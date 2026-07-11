import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class EmailDeliveryError(Exception):
    pass


def send_password_reset_email(api_key, from_email, to_email, reset_url):
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": "Restablece tu contrasena de Mythos",
        "html": (
            "<p>Hemos recibido una solicitud para restablecer tu contrasena de Mythos.</p>"
            f'<p><a href="{reset_url}">Crear una nueva contrasena</a></p>'
            "<p>Este enlace caduca en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>"
        ),
        "text": (
            "Hemos recibido una solicitud para restablecer tu contrasena de Mythos.\n\n"
            f"Crea una nueva contrasena desde este enlace: {reset_url}\n\n"
            "Este enlace caduca en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo."
        ),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                raise EmailDeliveryError("Resend rejected the email request.")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise EmailDeliveryError("Could not send password reset email.") from exc
