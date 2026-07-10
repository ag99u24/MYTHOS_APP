from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import WorkoutEntry

workouts_bp = Blueprint("workouts", __name__)


@workouts_bp.get("")
@jwt_required()
def list_workouts():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id = request.args.get("client_id", type=int) if role == "professional" else user_id

    if not client_id:
        return jsonify({"message": "client_id is required"}), 400

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

    entry = WorkoutEntry(
        client_id=int(get_jwt_identity()),
        title=data["title"],
        workout_type=data.get("workout_type"),
        duration_minutes=data.get("duration_minutes"),
        intensity=data.get("intensity"),
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"workout": entry.to_dict()}), 201
