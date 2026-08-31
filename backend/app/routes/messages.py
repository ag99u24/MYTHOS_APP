from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ChatMessage, ClientAssignment, User
from app.route_utils import paginate_query, parse_int, professional_has_client

messages_bp = Blueprint("messages", __name__)
MAX_MESSAGE_LENGTH = 1000


def get_professional_for_client(user_id, professional_id):
    if professional_id:
        if not professional_has_client(professional_id, user_id):
            return None
        return professional_id

    assignment = ClientAssignment.query.filter_by(client_id=user_id, status="active").first()
    return assignment.professional_id if assignment else None


def get_unread_messages_query(user_id, role):
    if role == "professional":
        client_id = request.args.get("client_id", type=int)
        if client_id and not professional_has_client(user_id, client_id):
            return None, jsonify({"message": "Client not found"}), 404

        query = ChatMessage.query.filter_by(professional_id=user_id, read_at=None)
        if client_id:
            query = query.filter_by(client_id=client_id)
        return query.filter(ChatMessage.sender_id != user_id), None, None

    professional_id = request.args.get("professional_id", type=int)
    if professional_id and not professional_has_client(professional_id, user_id):
        return None, jsonify({"message": "Professional not found"}), 404

    query = ChatMessage.query.filter_by(client_id=user_id, read_at=None)
    if professional_id:
        query = query.filter_by(professional_id=professional_id)
    return query.filter(ChatMessage.sender_id != user_id), None, None


@messages_bp.get("")
@jwt_required()
def list_messages():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    if role == "professional":
        client_id, error = parse_int(request.args.get("client_id"), "client_id")
        if error:
            return error
        if not professional_has_client(user_id, client_id):
            return jsonify({"message": "Client not found"}), 404
        query = ChatMessage.query.filter_by(professional_id=user_id, client_id=client_id)
    else:
        professional_id = request.args.get("professional_id", type=int)
        if professional_id and not professional_has_client(professional_id, user_id):
            return jsonify({"message": "Professional not found"}), 404
        query = ChatMessage.query.filter_by(client_id=user_id)
        if professional_id:
            query = query.filter_by(professional_id=professional_id)

    messages, meta = paginate_query(query.order_by(ChatMessage.created_at.asc()))
    unread_messages = [
        message for message in messages if message.sender_id != user_id and message.read_at is None
    ]
    if unread_messages:
        read_at = datetime.now(timezone.utc)
        for message in unread_messages:
            message.read_at = read_at
        db.session.commit()

    return jsonify({"messages": [message.to_dict() for message in messages], "meta": meta})


@messages_bp.get("/unread-count")
@jwt_required()
def unread_messages_count():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    query, error_response, status_code = get_unread_messages_query(user_id, role)
    if error_response is not None:
        return error_response, status_code

    return jsonify({"unread_count": query.count()})


@messages_bp.get("/unread-preview")
@jwt_required()
def unread_messages_preview():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    query, error_response, status_code = get_unread_messages_query(user_id, role)
    if error_response is not None:
        return error_response, status_code

    latest_message = query.order_by(ChatMessage.created_at.desc()).first()
    return jsonify({
        "unread_count": query.count(),
        "message": latest_message.to_dict(include_sender=True) if latest_message else None,
    })


@messages_bp.post("")
@jwt_required()
def create_message():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    data = request.get_json() or {}
    body = (data.get("body") or "").strip()

    if not body:
        return jsonify({"message": "Message body is required"}), 400
    if len(body) > MAX_MESSAGE_LENGTH:
        return jsonify({"message": f"Message body must be {MAX_MESSAGE_LENGTH} characters or fewer"}), 400

    if role == "professional":
        client_id, error = parse_int(data.get("client_id"), "client_id")
        if error:
            return error
        client = db.session.get(User, client_id)
        if not client or client.role != "client" or not professional_has_client(user_id, client_id):
            return jsonify({"message": "Client not found"}), 404
        professional_id = user_id
    else:
        professional_id = get_professional_for_client(user_id, data.get("professional_id"))
        if not professional_id:
            return jsonify({"message": "Professional not found"}), 404
        client_id = user_id

    message = ChatMessage(
        professional_id=professional_id,
        client_id=client_id,
        sender_id=user_id,
        body=body,
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({"message": message.to_dict()}), 201
