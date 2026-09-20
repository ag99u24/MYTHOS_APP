from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from app.models import Exercise


exercises_bp = Blueprint("exercises", __name__)


@exercises_bp.get("")
@jwt_required()
def list_exercises():
    query_text = (request.args.get("q") or "").strip()
    muscle_group = (request.args.get("muscle_group") or "").strip()
    pattern = (request.args.get("pattern") or "").strip()
    substitution_group = (request.args.get("substitution_group") or "").strip()
    query = Exercise.query.filter(Exercise.is_active.is_(True))

    if query_text:
        search = f"%{query_text}%"
        query = query.filter(
            or_(
                Exercise.name.ilike(search),
                Exercise.pattern.ilike(search),
                Exercise.movement_family.ilike(search),
                Exercise.substitution_group.ilike(search),
                Exercise.muscle_group.ilike(search),
                Exercise.secondary_muscles.ilike(search),
                Exercise.equipment.ilike(search),
            )
        )
    if muscle_group:
        query = query.filter(Exercise.muscle_group == muscle_group)
    if pattern:
        query = query.filter(Exercise.pattern == pattern)
    if substitution_group:
        query = query.filter(Exercise.substitution_group == substitution_group)

    exercises = query.order_by(Exercise.pattern.asc(), Exercise.substitution_group.asc(), Exercise.option_number.asc()).limit(150).all()
    groups = [row[0] for row in Exercise.query.with_entities(Exercise.muscle_group).filter(Exercise.is_active.is_(True)).distinct().order_by(Exercise.muscle_group.asc()).all()]
    patterns = [row[0] for row in Exercise.query.with_entities(Exercise.pattern).filter(Exercise.is_active.is_(True)).distinct().order_by(Exercise.pattern.asc()).all()]
    return jsonify({"exercises": [exercise.to_dict() for exercise in exercises], "muscle_groups": groups, "patterns": patterns})
