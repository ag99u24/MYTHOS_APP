from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import PlanItem, WorkoutEntry
from app.route_utils import get_client_id_for_tracking, paginate_query, parse_optional_int

workouts_bp = Blueprint("workouts", __name__)


@workouts_bp.get("")
@jwt_required()
def list_workouts():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

    entries, meta = paginate_query(WorkoutEntry.query.filter_by(client_id=client_id).order_by(WorkoutEntry.created_at.desc()))
    return jsonify({"workouts": [entry.to_dict() for entry in entries], "meta": meta})


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

    plan_item_id, error = parse_optional_int(data.get("plan_item_id"), "plan_item_id", minimum=1)
    if error:
        return error
    if plan_item_id is not None:
        plan_item = db.session.get(PlanItem, plan_item_id)
        if not plan_item or plan_item.plan.client_id != int(get_jwt_identity()):
            return jsonify({"message": "Plan item not found"}), 404

    sets_completed, error = parse_optional_int(data.get("sets_completed"), "sets_completed", minimum=0)
    if error:
        return error

    reps_completed, error = parse_optional_int(data.get("reps_completed"), "reps_completed", minimum=0)
    if error:
        return error

    entry = WorkoutEntry(
        client_id=int(get_jwt_identity()),
        plan_item_id=plan_item_id,
        title=data["title"].strip(),
        workout_type=data.get("workout_type"),
        duration_minutes=duration_minutes,
        sets_completed=sets_completed,
        reps_completed=reps_completed,
        intensity=data.get("intensity"),
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"workout": entry.to_dict()}), 201


@workouts_bp.patch("/<int:entry_id>")
@jwt_required()
def update_workout(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(WorkoutEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Workout entry not found"}), 404

    data = request.get_json() or {}
    if "title" in data:
        if not data.get("title"):
            return jsonify({"message": "Workout title is required"}), 400
        entry.title = data["title"].strip()

    if "duration_minutes" in data:
        duration_minutes, error = parse_optional_int(data.get("duration_minutes"), "duration_minutes", minimum=0)
        if error:
            return error
        entry.duration_minutes = duration_minutes

    if "sets_completed" in data:
        sets_completed, error = parse_optional_int(data.get("sets_completed"), "sets_completed", minimum=0)
        if error:
            return error
        entry.sets_completed = sets_completed

    if "reps_completed" in data:
        reps_completed, error = parse_optional_int(data.get("reps_completed"), "reps_completed", minimum=0)
        if error:
            return error
        entry.reps_completed = reps_completed

    for field in ["workout_type", "intensity", "notes"]:
        if field in data:
            setattr(entry, field, data[field])

    db.session.commit()
    return jsonify({"workout": entry.to_dict()})


@workouts_bp.delete("/<int:entry_id>")
@jwt_required()
def delete_workout(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(WorkoutEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Workout entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Workout entry deleted"})
