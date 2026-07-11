from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import WorkoutEntry
from app.route_utils import get_client_id_for_tracking, parse_optional_int

workouts_bp = Blueprint("workouts", __name__)


@workouts_bp.get("")
@jwt_required()
def list_workouts():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

    entries = WorkoutEntry.query.filter_by(client_id=client_id).order_by(WorkoutEntry.created_at.desc()).all()
    return jsonify({"workouts": [entry.to_dict() for entry in entries]})


@workouts_bp.post("")
@jwt_required()
def create_workout():
    if get_jwt().get("role") != "client":
        return jsonify({"message": "Only clients can register workouts"}), 403

    data = request.get_json() or {}
    if not data.get("title"):
        return jsonify({"message": "Workout title is required"}), 400

    duration_minutes, error = parse_optional_int(data.get("duration_minutes"), "duration_minutes", minimum=0)
    if error:
        return error

    entry = WorkoutEntry(
        client_id=int(get_jwt_identity()),
        title=data["title"].strip(),
        workout_type=data.get("workout_type"),
        duration_minutes=duration_minutes,
        intensity=data.get("intensity"),
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"workout": entry.to_dict()}), 201
