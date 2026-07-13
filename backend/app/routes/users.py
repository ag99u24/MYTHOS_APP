from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ClientAssignment, User
from app.route_utils import paginate_query

users_bp = Blueprint("users", __name__)


@users_bp.get("/clients")
@jwt_required()
def list_clients():
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can list clients"}), 403

    assignments, meta = paginate_query(
        ClientAssignment.query.filter_by(professional_id=user_id, status="active").order_by(ClientAssignment.created_at.desc())
    )
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

    existing_assignment = ClientAssignment.query.filter_by(
        professional_id=professional_id,
        client_id=client.id,
        status="active",
    ).first()

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

    assignment = ClientAssignment.query.filter_by(
        professional_id=professional_id,
        client_id=client_id,
        status="active",
    ).first()

    if not assignment:
        return jsonify({"message": "Client not found"}), 404

    assignment.status = "inactive"
    db.session.commit()

    return jsonify({"message": "Client removed"})


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

    db.session.commit()

    return jsonify({"user": user.to_dict()})
