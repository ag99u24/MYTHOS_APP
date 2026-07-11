from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import DietEntry
from app.route_utils import get_client_id_for_tracking, parse_optional_float, parse_optional_int

diet_bp = Blueprint("diet", __name__)


@diet_bp.get("")
@jwt_required()
def list_diet_entries():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

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

    adherence, error = parse_optional_int(adherence, "adherence_percentage", minimum=0, maximum=100)
    if error:
        return error

    meals_completed, error = parse_optional_int(data.get("meals_completed"), "meals_completed", minimum=0)
    if error:
        return error

    total_meals, error = parse_optional_int(data.get("total_meals"), "total_meals", minimum=0)
    if error:
        return error

    water_liters, error = parse_optional_float(data.get("water_liters"), "water_liters", minimum=0)
    if error:
        return error

    entry = DietEntry(
        client_id=int(get_jwt_identity()),
        adherence_percentage=adherence,
        meals_completed=meals_completed,
        total_meals=total_meals,
        water_liters=water_liters,
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"diet": entry.to_dict()}), 201
