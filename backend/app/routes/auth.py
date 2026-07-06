from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import PasswordResetToken, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    required_fields = ["name", "email", "password", "role"]
    missing_fields = [field for field in required_fields if not data.get(field)]

    if missing_fields:
        return jsonify({"message": "Missing required fields", "fields": missing_fields}), 400

    if data["role"] not in ["professional", "client"]:
        return jsonify({"message": "Role must be professional or client"}), 400

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

    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"access_token": access_token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"access_token": access_token, "user": user.to_dict()})


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

        return jsonify(
            {
                "message": "Password reset token created",
                "reset_token": token.token,
                "note": "Connect an email provider before production.",
            }
        )

    return jsonify({"message": "If the email exists, a reset link will be sent."})


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json() or {}
    token_value = data.get("token")
    password = data.get("password")

    if not token_value or not password:
        return jsonify({"message": "Token and password are required"}), 400

    token = PasswordResetToken.query.filter_by(token=token_value).first()
    if not token or token.used_at:
        return jsonify({"message": "Invalid or used token"}), 400

    token.user.set_password(password)
    token.used_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Password updated"})
