from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import DietEntry
from app.route_utils import get_client_id_for_tracking, paginate_query, parse_optional_float, parse_optional_int

diet_bp = Blueprint("diet", __name__)


@diet_bp.get("")
@jwt_required()
def list_diet_entries():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

    entries, meta = paginate_query(DietEntry.query.filter_by(client_id=client_id).order_by(DietEntry.created_at.desc()))
    return jsonify({"diet": [entry.to_dict() for entry in entries], "meta": meta})


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


@diet_bp.patch("/<int:entry_id>")
@jwt_required()
def update_diet_entry(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(DietEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Diet entry not found"}), 404

    data = request.get_json() or {}
    if "adherence_percentage" in data:
        adherence, error = parse_optional_int(data.get("adherence_percentage"), "adherence_percentage", minimum=0, maximum=100)
        if error:
            return error
        if adherence is None:
            return jsonify({"message": "adherence_percentage is required"}), 400
        entry.adherence_percentage = adherence

    if "meals_completed" in data:
        meals_completed, error = parse_optional_int(data.get("meals_completed"), "meals_completed", minimum=0)
        if error:
            return error
        entry.meals_completed = meals_completed

    if "total_meals" in data:
        total_meals, error = parse_optional_int(data.get("total_meals"), "total_meals", minimum=0)
        if error:
            return error
        entry.total_meals = total_meals

    if "water_liters" in data:
        water_liters, error = parse_optional_float(data.get("water_liters"), "water_liters", minimum=0)
        if error:
            return error
        entry.water_liters = water_liters

    if "notes" in data:
        entry.notes = data.get("notes")

    db.session.commit()
    return jsonify({"diet": entry.to_dict()})


@diet_bp.delete("/<int:entry_id>")
@jwt_required()
def delete_diet_entry(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(DietEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Diet entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Diet entry deleted"})
