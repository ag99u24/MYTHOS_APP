from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import DietEntry

diet_bp = Blueprint("diet", __name__)


@diet_bp.get("")
@jwt_required()
def list_diet_entries():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id = request.args.get("client_id", type=int) if role == "professional" else user_id

    if not client_id:
        return jsonify({"message": "client_id is required"}), 400

    entries = DietEntry.query.filter_by(client_id=client_id).order_by(DietEntry.created_at.desc()).all()
    return jsonify({"diet": [entry.to_dict() for entry in entries]})


@diet_bp.post("")
@jwt_required()
def create_diet_entry():
    if get_jwt().get("role") != "client":
        return jsonify({"message": "Only clients can register diet adherence"}), 403

    data = request.get_json() or {}
    adherence = data.get("adherence_percentage")

    if adherence is None:
        return jsonify({"message": "adherence_percentage is required"}), 400

    adherence = max(0, min(100, int(adherence)))
    entry = DietEntry(
        client_id=int(get_jwt_identity()),
        adherence_percentage=adherence,
        meals_completed=data.get("meals_completed"),
        total_meals=data.get("total_meals"),
        water_liters=data.get("water_liters"),
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"diet": entry.to_dict()}), 201
