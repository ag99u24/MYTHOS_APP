from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Plan, PlanItem, User
from app.route_utils import paginate_query, parse_int, parse_optional_date, parse_optional_int, professional_has_client

plans_bp = Blueprint("plans", __name__)
PLAN_STATUSES = {"draft", "active", "finished"}


def can_access_plan(plan, user_id, role):
    if role == "professional":
        return plan.professional_id == user_id
    return plan.client_id == user_id


def parse_plan_status(value):
    status = (value or "draft").strip() if isinstance(value, str) else value or "draft"
    if status not in PLAN_STATUSES:
        return None, (jsonify({"message": "status must be draft, active or finished"}), 400)
    return status, None


def parse_optional_plan_status(value):
    if value in (None, ""):
        return None, None
    return parse_plan_status(value)


@plans_bp.get("")
@jwt_required()
def list_plans():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    query = Plan.query.filter_by(professional_id=user_id)

    if role == "client":
        query = Plan.query.filter_by(client_id=user_id)
    elif request.args.get("client_id"):
        client_id, error = parse_int(request.args.get("client_id"), "client_id")
        if error:
            return error
        if not professional_has_client(user_id, client_id):
            return jsonify({"message": "Client not found"}), 404
        query = query.filter_by(client_id=client_id)

    status, error = parse_optional_plan_status(request.args.get("status"))
    if error:
        return error
    if status:
        query = query.filter_by(status=status)

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category.strip())

    plans, meta = paginate_query(query.order_by(Plan.created_at.desc()))
    return jsonify({"plans": [plan.to_dict() for plan in plans], "meta": meta})


@plans_bp.post("")
@jwt_required()
def create_plan():
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional":
        return jsonify({"message": "Only professionals can create plans"}), 403

    data = request.get_json() or {}
    required_fields = ["title", "category", "client_id"]
    missing_fields = [field for field in required_fields if not data.get(field)]

    if missing_fields:
        return jsonify({"message": "Missing required fields", "fields": missing_fields}), 400

    client_id, error = parse_int(data.get("client_id"), "client_id")
    if error:
        return error

    client = db.session.get(User, client_id)
    if not client or client.role != "client":
        return jsonify({"message": "Client not found"}), 404

    if not professional_has_client(user_id, client.id):
        return jsonify({"message": "Client not found"}), 404

    start_date, error = parse_optional_date(data.get("start_date"), "start_date")
    if error:
        return error

    end_date, error = parse_optional_date(data.get("end_date"), "end_date")
    if error:
        return error

    if start_date and end_date and end_date < start_date:
        return jsonify({"message": "end_date must be after start_date"}), 400

    status, error = parse_plan_status(data.get("status"))
    if error:
        return error

    raw_items = data.get("items", [])
    plan_items = [item for item in raw_items if (item.get("title") or "").strip()]
    if not plan_items:
        return jsonify({"message": "At least one plan item is required"}), 400

    plan = Plan(
        title=data["title"].strip(),
        description=data.get("description"),
        category=data["category"].strip(),
        status=status,
        start_date=start_date,
        end_date=end_date,
        professional_id=user_id,
        client_id=client.id,
    )

    for index, item in enumerate(plan_items):
        sort_order, error = parse_optional_int(item.get("sort_order", index), "sort_order", minimum=0)
        if error:
            return error

        plan.items.append(
            PlanItem(
                day=item.get("day", "General"),
                title=item["title"].strip(),
                details=item.get("details"),
                sort_order=sort_order if sort_order is not None else index,
            )
        )

    db.session.add(plan)
    db.session.commit()

    return jsonify({"plan": plan.to_dict()}), 201


@plans_bp.get("/<int:plan_id>")
@jwt_required()
def get_plan(plan_id):
    plan = db.session.get(Plan, plan_id)
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    if not plan or not can_access_plan(plan, user_id, role):
        return jsonify({"message": "Plan not found"}), 404

    return jsonify({"plan": plan.to_dict()})


@plans_bp.patch("/<int:plan_id>")
@jwt_required()
def update_plan(plan_id):
    plan = db.session.get(Plan, plan_id)
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional" or not plan or plan.professional_id != user_id:
        return jsonify({"message": "Plan not found"}), 404

    data = request.get_json() or {}
    for field in ["title", "description", "category"]:
        if field in data:
            setattr(plan, field, data[field].strip() if isinstance(data[field], str) else data[field])

    if "status" in data:
        status, error = parse_plan_status(data.get("status"))
        if error:
            return error
        plan.status = status

    if "start_date" in data:
        start_date, error = parse_optional_date(data["start_date"], "start_date")
        if error:
            return error
        plan.start_date = start_date
    if "end_date" in data:
        end_date, error = parse_optional_date(data["end_date"], "end_date")
        if error:
            return error
        plan.end_date = end_date

    if plan.start_date and plan.end_date and plan.end_date < plan.start_date:
        return jsonify({"message": "end_date must be after start_date"}), 400

    if "items" in data:
        plan_items = [item for item in data["items"] if (item.get("title") or "").strip()]
        if not plan_items:
            return jsonify({"message": "At least one plan item is required"}), 400

        plan.items.clear()
        for index, item in enumerate(plan_items):
            sort_order, error = parse_optional_int(item.get("sort_order", index), "sort_order", minimum=0)
            if error:
                return error

            plan.items.append(
                PlanItem(
                    day=item.get("day", "General"),
                    title=item["title"].strip(),
                    details=item.get("details"),
                    sort_order=sort_order if sort_order is not None else index,
                )
            )

    db.session.commit()

    return jsonify({"plan": plan.to_dict()})


@plans_bp.delete("/<int:plan_id>")
@jwt_required()
def delete_plan(plan_id):
    plan = db.session.get(Plan, plan_id)
    user_id = int(get_jwt_identity())

    if get_jwt().get("role") != "professional" or not plan or plan.professional_id != user_id:
        return jsonify({"message": "Plan not found"}), 404

    db.session.delete(plan)
    db.session.commit()

    return jsonify({"message": "Plan deleted"})
