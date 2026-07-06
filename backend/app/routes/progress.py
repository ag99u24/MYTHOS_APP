from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ProgressEntry

progress_bp = Blueprint("progress", __name__)


@progress_bp.get("")
@jwt_required()
def list_progress():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id = request.args.get("client_id", type=int) if role == "professional" else user_id

    if not client_id:
        return jsonify({"message": "client_id is required"}), 400

    entries = ProgressEntry.query.filter_by(client_id=client_id).order_by(ProgressEntry.created_at.desc()).all()
    return jsonify({"progress": [entry.to_dict() for entry in entries]})


@progress_bp.post("")
@jwt_required()
def create_progress():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    entry = ProgressEntry(
        client_id=user_id,
        weight=data.get("weight"),
        body_fat=data.get("body_fat"),
        mood=data.get("mood"),
        notes=data.get("notes"),
        photo_url=data.get("photo_url"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"progress": entry.to_dict()}), 201
