from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, set_access_cookies, unset_jwt_cookies

from app.extensions import db
from app.email_service import EmailDeliveryError, send_password_reset_email
from app.models import PasswordResetToken, User

auth_bp = Blueprint("auth", __name__)


def validate_password(password):
    if not password or len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400

    return None


def make_session_response(user, status_code=200):
    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    response = jsonify({"access_token": access_token, "user": user.to_dict()})
    set_access_cookies(response, access_token)
    return response, status_code


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    required_fields = ["name", "email", "password", "role"]
    missing_fields = [field for field in required_fields if not data.get(field)]

    if missing_fields:
        return jsonify({"message": "Missing required fields", "fields": missing_fields}), 400

    if data["role"] not in ["professional", "client"]:
        return jsonify({"message": "Role must be professional or client"}), 400

    password_error = validate_password(data["password"])
    if password_error:
        return password_error

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    user = User(
        name=data["name"].strip(),
        email=email,
        role=data["role"],
        specialty=data.get("specialty"),
        goal=data.get("goal"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return make_session_response(user, 201)


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    return make_session_response(user)


@auth_bp.post("/logout")
def logout():
    response = jsonify({"message": "Session closed"})
    unset_jwt_cookies(response)
    return response


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user.to_dict()})


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    if user:
        token = PasswordResetToken(user_id=user.id)
        db.session.add(token)
        db.session.commit()

        response = {"message": "If the email exists, a reset link will be sent."}
        reset_url = f"{current_app.config['FRONTEND_URL'].rstrip('/')}/reset-password?token={token.token}"
        resend_api_key = current_app.config["RESEND_API_KEY"]

        if resend_api_key:
            try:
                send_password_reset_email(
                    api_key=resend_api_key,
                    from_email=current_app.config["MAIL_FROM"],
                    to_email=user.email,
                    reset_url=reset_url,
                )
                response["message"] = "Revisa tu email para restablecer la contrasena."
            except EmailDeliveryError:
                current_app.logger.exception("Password reset email could not be sent.")
                return jsonify({"message": "No se pudo enviar el email de recuperacion."}), 502

        if current_app.config["ALLOW_RESET_TOKEN_RESPONSE"]:
            response["reset_token"] = token.token
            response["note"] = "Development only. Disable ALLOW_RESET_TOKEN_RESPONSE in production."

        return jsonify(response)

    return jsonify({"message": "If the email exists, a reset link will be sent."})


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json() or {}
    token_value = data.get("token")
    password = data.get("password")

    if not token_value or not password:
        return jsonify({"message": "Token and password are required"}), 400

    password_error = validate_password(password)
    if password_error:
        return password_error

    token = PasswordResetToken.query.filter_by(token=token_value).first()
    if not token or token.used_at or token.is_expired():
        return jsonify({"message": "Invalid, used or expired token"}), 400

    token.user.set_password(password)
    token.used_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Password updated"})
