from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import DietEntry, PlanItem
from app.route_utils import get_client_id_for_tracking, paginate_query, parse_optional_date, parse_optional_float, parse_optional_int

diet_bp = Blueprint("diet", __name__)
MIN_WORD_LENGTH = 3
STOPWORDS = {
    "con",
    "del",
    "las",
    "los",
    "para",
    "por",
    "una",
    "uno",
    "y",
}
MEAL_TYPES = {"desayuno", "comida", "cena", "agregados"}


def parse_meal_type(value):
    meal_type = (value or "agregados").strip().lower()
    if meal_type not in MEAL_TYPES:
        return None, (jsonify({"message": "meal_type must be desayuno, comida, cena or agregados"}), 400)
    return meal_type, None


def calculate_macro(value_per_100g, quantity_g):
    if value_per_100g is None or quantity_g is None:
        return None
    return round((float(value_per_100g) * float(quantity_g)) / 100, 2)


def calculate_or_use_total(total_value, value_per_100g, quantity_g):
    if total_value is not None:
        return round(float(total_value), 2)
    return calculate_macro(value_per_100g, quantity_g)


def tokenize_food_text(value):
    cleaned = "".join(character.lower() if character.isalnum() else " " for character in (value or ""))
    return {
        token
        for token in cleaned.split()
        if len(token) >= MIN_WORD_LENGTH and token not in STOPWORDS
    }


def calculate_adherence(recommended_text, consumed_food):
    consumed_tokens = tokenize_food_text(consumed_food)
    if not consumed_tokens:
        return 0

    recommended_tokens = tokenize_food_text(recommended_text)
    if not recommended_tokens:
        return 100

    matches = recommended_tokens.intersection(consumed_tokens)
    return min(100, round((len(matches) / len(recommended_tokens)) * 100))


def get_recommended_text(entry):
    if entry.plan_item:
        return " ".join(filter(None, [entry.plan_item.title, entry.plan_item.details]))
    return entry.recommended_meal or ""


@diet_bp.get("")
@jwt_required()
def list_diet_entries():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")
    client_id, error = get_client_id_for_tracking(user_id, role)
    if error:
        return error

    entries, meta = paginate_query(DietEntry.query.filter_by(client_id=client_id).order_by(DietEntry.created_at.desc()))
    return jsonify({"diet": [entry.to_dict() for entry in entries], "meta": meta})


@diet_bp.post("")
@jwt_required()
def create_diet_entry():
    if get_jwt().get("role") != "client":
        return jsonify({"message": "Only clients can register diet adherence"}), 403

    data = request.get_json() or {}
    consumed_food = (data.get("consumed_food") or "").strip()
    if not consumed_food:
        return jsonify({"message": "consumed_food is required"}), 400

    meal_type, error = parse_meal_type(data.get("meal_type"))
    if error:
        return error

    consumed_date, error = parse_optional_date(data.get("consumed_date"), "consumed_date")
    if error:
        return error
    consumed_date = consumed_date or date.today()

    quantity_g, error = parse_optional_float(data.get("quantity_g"), "quantity_g", minimum=0)
    if error:
        return error

    plan_item_id, error = parse_optional_int(data.get("plan_item_id"), "plan_item_id", minimum=1)
    if error:
        return error
    recommended_text = data.get("recommended_meal") or ""
    if plan_item_id is not None:
        plan_item = db.session.get(PlanItem, plan_item_id)
        if not plan_item or plan_item.plan.client_id != int(get_jwt_identity()):
            return jsonify({"message": "Plan item not found"}), 404
        recommended_text = " ".join(filter(None, [plan_item.title, plan_item.details]))

    meals_completed, error = parse_optional_int(data.get("meals_completed"), "meals_completed", minimum=0)
    if error:
        return error

    total_meals, error = parse_optional_int(data.get("total_meals"), "total_meals", minimum=0)
    if error:
        return error

    water_liters, error = parse_optional_float(data.get("water_liters"), "water_liters", minimum=0)
    if error:
        return error

    calories_100g, error = parse_optional_float(data.get("calories_kcal_100g"), "calories_kcal_100g", minimum=0)
    if error:
        return error
    calories_total, error = parse_optional_float(data.get("calories_kcal"), "calories_kcal", minimum=0)
    if error:
        return error
    protein_100g, error = parse_optional_float(data.get("protein_g_100g"), "protein_g_100g", minimum=0)
    if error:
        return error
    protein_total, error = parse_optional_float(data.get("protein_g"), "protein_g", minimum=0)
    if error:
        return error
    carbs_100g, error = parse_optional_float(data.get("carbs_g_100g"), "carbs_g_100g", minimum=0)
    if error:
        return error
    carbs_total, error = parse_optional_float(data.get("carbs_g"), "carbs_g", minimum=0)
    if error:
        return error
    fat_100g, error = parse_optional_float(data.get("fat_g_100g"), "fat_g_100g", minimum=0)
    if error:
        return error
    fat_total, error = parse_optional_float(data.get("fat_g"), "fat_g", minimum=0)
    if error:
        return error
    sugars_100g, error = parse_optional_float(data.get("sugars_g_100g"), "sugars_g_100g", minimum=0)
    if error:
        return error
    sugars_total, error = parse_optional_float(data.get("sugars_g"), "sugars_g", minimum=0)
    if error:
        return error
    salt_100g, error = parse_optional_float(data.get("salt_g_100g"), "salt_g_100g", minimum=0)
    if error:
        return error
    salt_total, error = parse_optional_float(data.get("salt_g"), "salt_g", minimum=0)
    if error:
        return error

    adherence = calculate_adherence(recommended_text, consumed_food)

    entry = DietEntry(
        client_id=int(get_jwt_identity()),
        plan_item_id=plan_item_id,
        adherence_percentage=adherence,
        meal_type=meal_type,
        consumed_date=consumed_date,
        meals_completed=meals_completed,
        total_meals=total_meals,
        water_liters=water_liters,
        consumed_food=consumed_food,
        recommended_meal=data.get("recommended_meal") or (plan_item.title if plan_item_id is not None else None),
        product_code=data.get("product_code"),
        brand=data.get("brand"),
        quantity_g=quantity_g,
        calories_kcal=calculate_or_use_total(calories_total, calories_100g, quantity_g),
        protein_g=calculate_or_use_total(protein_total, protein_100g, quantity_g),
        carbs_g=calculate_or_use_total(carbs_total, carbs_100g, quantity_g),
        fat_g=calculate_or_use_total(fat_total, fat_100g, quantity_g),
        sugars_g=calculate_or_use_total(sugars_total, sugars_100g, quantity_g),
        salt_g=calculate_or_use_total(salt_total, salt_100g, quantity_g),
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"diet": entry.to_dict()}), 201


@diet_bp.patch("/<int:entry_id>")
@jwt_required()
def update_diet_entry(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(DietEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Diet entry not found"}), 404

    data = request.get_json() or {}
    if "meals_completed" in data:
        meals_completed, error = parse_optional_int(data.get("meals_completed"), "meals_completed", minimum=0)
        if error:
            return error
        entry.meals_completed = meals_completed

    if "total_meals" in data:
        total_meals, error = parse_optional_int(data.get("total_meals"), "total_meals", minimum=0)
        if error:
            return error
        entry.total_meals = total_meals

    if "water_liters" in data:
        water_liters, error = parse_optional_float(data.get("water_liters"), "water_liters", minimum=0)
        if error:
            return error
        entry.water_liters = water_liters

    for field in ["consumed_food", "recommended_meal"]:
        if field in data:
            setattr(entry, field, data.get(field))

    if "notes" in data:
        entry.notes = data.get("notes")

    if "consumed_food" in data or "recommended_meal" in data:
        entry.adherence_percentage = calculate_adherence(get_recommended_text(entry), entry.consumed_food)

    db.session.commit()
    return jsonify({"diet": entry.to_dict()})


@diet_bp.delete("/<int:entry_id>")
@jwt_required()
def delete_diet_entry(entry_id):
    user_id = int(get_jwt_identity())
    entry = db.session.get(DietEntry, entry_id)

    if get_jwt().get("role") != "client" or not entry or entry.client_id != user_id:
        return jsonify({"message": "Diet entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Diet entry deleted"})
