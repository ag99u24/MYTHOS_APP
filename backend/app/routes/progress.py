from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ProgressEntry
from app.route_utils import get_client_id_for_tracking, parse_optional_float

progress_bp = Blueprint("progress", __name__)


@progress_bp.get("")
@jwt_required()
def list_progress():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

    entries = ProgressEntry.query.filter_by(client_id=client_id).order_by(ProgressEntry.created_at.desc()).all()
    return jsonify({"progress": [entry.to_dict() for entry in entries]})


@progress_bp.post("")
@jwt_required()
def create_progress():
    if get_jwt().get("role") != "client":
        return jsonify({"message": "Only clients can register progress"}), 403

    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    weight, error = parse_optional_float(data.get("weight"), "weight", minimum=0)
    if error:
        return error

    body_fat, error = parse_optional_float(data.get("body_fat"), "body_fat", minimum=0, maximum=100)
    if error:
        return error

    entry = ProgressEntry(
        client_id=user_id,
        weight=weight,
        body_fat=body_fat,
        mood=data.get("mood"),
        notes=data.get("notes"),
        photo_url=data.get("photo_url"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"progress": entry.to_dict()}), 201


@progress_bp.patch("/<int:entry_id>")
@jwt_required()
def update_progress(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(ProgressEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Progress entry not found"}), 404

    data = request.get_json() or {}
    if "weight" in data:
        weight, error = parse_optional_float(data.get("weight"), "weight", minimum=0)
        if error:
            return error
        entry.weight = weight

    if "body_fat" in data:
        body_fat, error = parse_optional_float(data.get("body_fat"), "body_fat", minimum=0, maximum=100)
        if error:
            return error
        entry.body_fat = body_fat

    for field in ["mood", "notes", "photo_url"]:
        if field in data:
            setattr(entry, field, data[field])

    db.session.commit()
    return jsonify({"progress": entry.to_dict()})


@progress_bp.delete("/<int:entry_id>")
@jwt_required()
def delete_progress(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(ProgressEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Progress entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Progress entry deleted"})
