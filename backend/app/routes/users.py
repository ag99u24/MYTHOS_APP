from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models import ClientAssignment, DietEntry, Plan, ProgressEntry, SessionAppointment, User, WorkoutEntry
from app.route_utils import paginate_query, validate_email

users_bp = Blueprint("users", __name__)


def get_active_assignment(professional_id, client_id):
    return ClientAssignment.query.filter_by(
        professional_id=professional_id,
        client_id=client_id,
        status="active",
    ).first()


@users_bp.get("/clients")
@jwt_required()
def list_clients():
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can list clients"}), 403

    query = ClientAssignment.query.join(User, ClientAssignment.client_id == User.id).filter(
        ClientAssignment.professional_id == user_id,
        ClientAssignment.status == "active",
    )
    search = (request.args.get("q") or "").strip()
    if search:
        like_search = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(like_search),
                User.email.ilike(like_search),
                User.goal.ilike(like_search),
            )
        )

    assignments, meta = paginate_query(query.order_by(ClientAssignment.created_at.desc()))
    return jsonify({"clients": [assignment.client.to_dict() for assignment in assignments], "meta": meta})


@users_bp.post("/clients")
@jwt_required()
def assign_client():
    professional_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can add clients"}), 403

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    client = User.query.filter_by(email=email, role="client").first()

    if not client:
        return jsonify({"message": "Client not found"}), 404

    existing_assignment = get_active_assignment(professional_id, client.id)

    if existing_assignment:
        return jsonify({"message": "Client already assigned"}), 409

    assignment = ClientAssignment(professional_id=professional_id, client_id=client.id)
    db.session.add(assignment)
    db.session.commit()

    return jsonify({"client": client.to_dict()}), 201


@users_bp.delete("/clients/<int:client_id>")
@jwt_required()
def unassign_client(client_id):
    professional_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can remove clients"}), 403

    assignment = get_active_assignment(professional_id, client_id)

    if not assignment:
        return jsonify({"message": "Client not found"}), 404

    assignment.status = "inactive"
    db.session.commit()

    return jsonify({"message": "Client removed"})


@users_bp.get("/clients/<int:client_id>/summary")
@jwt_required()
def get_client_summary(client_id):
    professional_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can view client summaries"}), 403

    assignment = get_active_assignment(professional_id, client_id)
    if not assignment:
        return jsonify({"message": "Client not found"}), 404

    plans = (
        Plan.query.filter_by(professional_id=professional_id, client_id=client_id)
        .order_by(Plan.created_at.desc())
        .limit(20)
        .all()
    )
    progress = (
        ProgressEntry.query.filter_by(client_id=client_id)
        .order_by(ProgressEntry.created_at.desc())
        .limit(10)
        .all()
    )
    workouts = (
        WorkoutEntry.query.filter_by(client_id=client_id)
        .order_by(WorkoutEntry.created_at.desc())
        .limit(10)
        .all()
    )
    diet = (
        DietEntry.query.filter_by(client_id=client_id)
        .order_by(DietEntry.created_at.desc())
        .limit(10)
        .all()
    )
    sessions = (
        SessionAppointment.query.filter_by(professional_id=professional_id, client_id=client_id)
        .order_by(SessionAppointment.scheduled_at.desc())
        .limit(10)
        .all()
    )

    return jsonify(
        {
            "client": assignment.client.to_dict(),
            "plans": [plan.to_dict() for plan in plans],
            "progress": [entry.to_dict() for entry in progress],
            "workouts": [entry.to_dict() for entry in workouts],
            "diet": [entry.to_dict() for entry in diet],
            "sessions": [session.to_dict() for session in sessions],
        }
    )


@users_bp.patch("/me")
@jwt_required()
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))

    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json() or {}
    for field in ["name", "specialty", "goal", "avatar_url"]:
        if field in data:
            setattr(user, field, data[field])

    if "email" in data:
        email, email_error = validate_email(data.get("email"))
        if email_error:
            return email_error
        existing_user = User.query.filter(User.email == email, User.id != user.id).first()
        if existing_user:
            return jsonify({"message": "Email already registered"}), 409
        user.email = email

    db.session.commit()

    return jsonify({"user": user.to_dict()})
