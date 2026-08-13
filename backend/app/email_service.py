import json
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class EmailDeliveryError(Exception):
    pass


def send_password_reset_email(api_key, from_email, to_email, reset_url):
    safe_reset_url = escape(reset_url, quote=True)
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": "Restablece tu contrasena en Mythos",
        "html": (
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0b0c10;line-height:1.6">'
            '<div style="border-bottom:3px solid #a30000;padding:24px 0 16px">'
            '<h1 style="margin:0;font-size:24px">Mythos</h1>'
            '<p style="margin:6px 0 0;color:#4f5d75">Recuperacion de contrasena</p>'
            "</div>"
            '<div style="padding:24px 0">'
            "<p>Hemos recibido una solicitud para restablecer tu contrasena de Mythos.</p>"
            f'<p><a href="{safe_reset_url}" style="display:inline-block;background:#a30000;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">Crear una nueva contrasena</a></p>'
            "<p>Este enlace caduca en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>"
            '<p style="font-size:13px;color:#4f5d75">Si el boton no funciona, copia y pega este enlace en tu navegador:<br>'
            f'<span style="word-break:break-all">{safe_reset_url}</span></p>'
            "</div>"
            "</div>"
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
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise EmailDeliveryError(f"Resend rejected the email request: {error_body}") from exc
    except (URLError, TimeoutError) as exc:
        raise EmailDeliveryError("Could not send password reset email.") from exc
