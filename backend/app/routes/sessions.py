from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import SessionAppointment, User
from app.route_utils import paginate_query, parse_datetime, parse_int, parse_optional_int, professional_has_client

sessions_bp = Blueprint("sessions", __name__)


def can_access_session(session, user_id, role):
    if role == "professional":
        return session.professional_id == user_id
    return session.client_id == user_id


@sessions_bp.get("")
@jwt_required()
def list_sessions():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    query = SessionAppointment.query.filter_by(professional_id=user_id)

    if role == "client":
        query = SessionAppointment.query.filter_by(client_id=user_id)
    elif request.args.get("client_id"):
        client_id, error = parse_int(request.args.get("client_id"), "client_id")
        if error:
            return error
        if not professional_has_client(user_id, client_id):
            return jsonify({"message": "Client not found"}), 404
        query = query.filter_by(client_id=client_id)

    sessions, meta = paginate_query(query.order_by(SessionAppointment.scheduled_at.desc()))
    return jsonify({"sessions": [session.to_dict() for session in sessions], "meta": meta})


@sessions_bp.post("")
@jwt_required()
def create_session():
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can create sessions"}), 403

    data = request.get_json() or {}
    required_fields = ["title", "client_id", "scheduled_at"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"message": "Missing required fields", "fields": missing_fields}), 400

    client_id, error = parse_int(data.get("client_id"), "client_id")
    if error:
        return error

    client = db.session.get(User, client_id)
    if not client or client.role != "client" or not professional_has_client(user_id, client_id):
        return jsonify({"message": "Client not found"}), 404

    scheduled_at, error = parse_datetime(data.get("scheduled_at"), "scheduled_at")
    if error:
        return error

    duration_minutes, error = parse_optional_int(data.get("duration_minutes"), "duration_minutes", minimum=0)
    if error:
        return error

    session = SessionAppointment(
        title=data["title"].strip(),
        session_type=data.get("session_type") or "Revision",
        status=data.get("status") or "scheduled",
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        meeting_url=data.get("meeting_url"),
        notes=data.get("notes"),
        professional_id=user_id,
        client_id=client_id,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({"session": session.to_dict()}), 201


@sessions_bp.patch("/<int:session_id>")
@jwt_required()
def update_session(session_id):
    user_id = int(get_jwt_identity())
    session = db.session.get(SessionAppointment, session_id)

    if get_jwt().get("role") != "professional" or not session or session.professional_id != user_id:
        return jsonify({"message": "Session not found"}), 404

    data = request.get_json() or {}
    for field in ["title", "session_type", "status", "meeting_url", "notes"]:
        if field in data:
            value = data[field].strip() if isinstance(data[field], str) else data[field]
            setattr(session, field, value)

    if "scheduled_at" in data:
        scheduled_at, error = parse_datetime(data.get("scheduled_at"), "scheduled_at")
        if error:
            return error
        session.scheduled_at = scheduled_at

    if "duration_minutes" in data:
        duration_minutes, error = parse_optional_int(data.get("duration_minutes"), "duration_minutes", minimum=0)
        if error:
            return error
        session.duration_minutes = duration_minutes

    db.session.commit()
    return jsonify({"session": session.to_dict()})


@sessions_bp.delete("/<int:session_id>")
@jwt_required()
def delete_session(session_id):
    user_id = int(get_jwt_identity())
    session = db.session.get(SessionAppointment, session_id)

    if get_jwt().get("role") != "professional" or not session or session.professional_id != user_id:
        return jsonify({"message": "Session not found"}), 404

    db.session.delete(session)
    db.session.commit()
    return jsonify({"message": "Session deleted"})
