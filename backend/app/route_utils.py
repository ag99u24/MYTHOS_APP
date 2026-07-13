from datetime import date, datetime, timezone

from flask import jsonify, request

from app.models import ClientAssignment


def parse_int(value, field_name):
    if value is None or value == "":
        return None, (jsonify({"message": f"{field_name} is required"}), 400)

    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"{field_name} must be a valid number"}), 400)


def parse_optional_float(value, field_name, minimum=None, maximum=None):
    if value in (None, ""):
        return None, None

    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"{field_name} must be a valid number"}), 400)

    if minimum is not None and parsed < minimum:
        return None, (jsonify({"message": f"{field_name} must be greater than or equal to {minimum}"}), 400)
    if maximum is not None and parsed > maximum:
        return None, (jsonify({"message": f"{field_name} must be less than or equal to {maximum}"}), 400)

    return parsed, None


def parse_optional_int(value, field_name, minimum=None, maximum=None):
    if value in (None, ""):
        return None, None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"{field_name} must be a valid number"}), 400)

    if minimum is not None and parsed < minimum:
        return None, (jsonify({"message": f"{field_name} must be greater than or equal to {minimum}"}), 400)
    if maximum is not None and parsed > maximum:
        return None, (jsonify({"message": f"{field_name} must be less than or equal to {maximum}"}), 400)

    return parsed, None


def parse_optional_date(value, field_name):
    if value in (None, ""):
        return None, None

    try:
        return date.fromisoformat(value), None
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"{field_name} must be a valid date"}), 400)


def parse_datetime(value, field_name):
    if not value:
        return None, (jsonify({"message": f"{field_name} is required"}), 400)

    normalized = value.replace("Z", "+00:00") if isinstance(value, str) else value
    try:
        return datetime.fromisoformat(normalized), None
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"{field_name} must be a valid datetime"}), 400)


def paginate_query(query, default_per_page=50, max_per_page=100):
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=default_per_page, type=int)
    page = max(page, 1)
    per_page = min(max(per_page, 1), max_per_page)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return pagination.items, {
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }


def get_client_id_for_tracking(user_id, role):
    if role != "professional":
        return user_id, None

    client_id, error = parse_int(request.args.get("client_id"), "client_id")
    if error:
        return None, error

    if not professional_has_client(user_id, client_id):
        return None, (jsonify({"message": "Client not found"}), 404)

    return client_id, None


def professional_has_client(professional_id, client_id):
    return (
        ClientAssignment.query.filter_by(
            professional_id=professional_id,
            client_id=client_id,
            status="active",
        ).first()
        is not None
    )


def utc_now():
    return datetime.now(timezone.utc)
