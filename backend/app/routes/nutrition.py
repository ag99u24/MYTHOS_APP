from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from app.models import Food

nutrition_bp = Blueprint("nutrition", __name__)
OFF_FIELDS = (
    "code,product_name,product_name_es,generic_name,generic_name_es,brands,"
    "nutriscore_grade,nutrition_grades,image_front_small_url,nutriments"
)
QUERY_FALLBACKS = {
    "pechuga de pollo": ["chicken breast", "pollo", "chicken"],
    "pollo": ["chicken"],
    "arroz": ["rice"],
    "avena": ["oats"],
    "huevo": ["egg"],
    "huevos": ["eggs"],
    "atun": ["tuna"],
    "atún": ["tuna"],
    "patata": ["potato"],
    "papa": ["potato"],
    "platano": ["banana"],
    "plátano": ["banana"],
}
STOP_WORDS = {"de", "del", "la", "el", "los", "las", "con", "sin", "para", "y"}
MAX_PRODUCTS = 30
MACRO_KEYS = ("calories_kcal", "protein_g", "carbs_g", "fat_g")
MEAL_TEMPLATES = (
    {
        "title": "Pavo, pan integral y aceite de oliva",
        "foods": (("protein", "Pechuga de pavo sin piel"), ("carbs", "Pan integral"), ("fat", "Aceite de oliva virgen extra")),
    },
    {
        "title": "Avena, skyr y nueces",
        "foods": (("carbs", "Avena en copos"), ("protein", "Skyr natural 0%"), ("fat", "Nuez")),
    },
    {
        "title": "Pollo, arroz y aceite de oliva",
        "foods": (("protein", "Pechuga de pollo sin piel"), ("carbs", "Arroz blanco cocido"), ("fat", "Aceite de oliva virgen extra")),
    },
    {
        "title": "Huevos y pan integral",
        "foods": (("protein", "Huevo entero"), ("carbs", "Pan integral"), ("fat", "Aceite de oliva virgen extra")),
    },
    {
        "title": "Skyr, platano y nueces",
        "foods": (("protein", "Skyr natural 0%"), ("carbs", "Platano"), ("fat", "Nuez")),
    },
)


def fetch_open_food_facts(query, host):
    params = urlencode(
        {
            "search_terms": query,
            "search_simple": "1",
            "action": "process",
            "json": "1",
            "page_size": str(MAX_PRODUCTS),
            "lc": "es",
            "cc": "es",
            "sort_by": "popularity_key",
            "fields": OFF_FIELDS,
        }
    )
    open_food_facts_url = f"https://{host}/cgi/search.pl?{params}"
    outbound_request = Request(
        open_food_facts_url,
        headers={"User-Agent": "MythosApp/1.0 (contact: support@mythos.local)"},
    )

    with urlopen(outbound_request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_product(product):
    name = product.get("product_name_es") or product.get("product_name") or product.get("generic_name_es") or product.get("generic_name")
    nutriments = product.get("nutriments") or {}
    return {
        **product,
        "code": product.get("code"),
        "product_name": name or "Producto sin nombre",
        "brands": product.get("brands"),
        "nutriscore_grade": product.get("nutriscore_grade") or product.get("nutrition_grades"),
        "nutrition": {
            "calories_kcal_100g": nutriments.get("energy-kcal_100g"),
            "protein_g_100g": nutriments.get("proteins_100g"),
            "carbs_g_100g": nutriments.get("carbohydrates_100g"),
            "fat_g_100g": nutriments.get("fat_100g"),
            "sugars_g_100g": nutriments.get("sugars_100g"),
            "salt_g_100g": nutriments.get("salt_100g"),
        },
    }


def build_query_variants(query):
    normalized_query = query.lower()
    variants = [query]

    for fallback_query in QUERY_FALLBACKS.get(normalized_query, []):
        if fallback_query not in variants:
            variants.append(fallback_query)

    for word in normalized_query.replace(",", " ").split():
        if len(word) > 3 and word not in STOP_WORDS and word not in variants:
            variants.append(word)

    return variants


def product_identity(product):
    code = product.get("code")
    if code:
        return f"code:{code}"
    name = product.get("product_name_es") or product.get("product_name") or product.get("generic_name_es") or product.get("generic_name") or ""
    return f"name:{name.strip().lower()}"


def search_mythos_foods(query):
    pattern = f"%{query}%"
    return (
        Food.query.filter(
            Food.is_active.is_(True),
            or_(
                Food.name.ilike(pattern),
                Food.category.ilike(pattern),
                Food.subcategory.ilike(pattern),
                Food.presentation.ilike(pattern),
            ),
        )
        .order_by(Food.name.asc())
        .limit(MAX_PRODUCTS)
        .all()
    )


def parse_target(value):
    if value in (None, ""):
        return 0
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0
    return parsed if parsed > 0 else 0


def food_macro(food, macro_key):
    return getattr(food, f"{macro_key}_100g", None) or 0


def find_food_by_name(name):
    return (
        Food.query.filter(Food.is_active.is_(True), Food.name.ilike(name))
        .order_by(Food.name.asc())
        .first()
    )


def calculate_food_totals(food, quantity_g):
    return {
        "calories_kcal": round(food_macro(food, "calories_kcal") * quantity_g / 100, 1),
        "protein_g": round(food_macro(food, "protein_g") * quantity_g / 100, 1),
        "carbs_g": round(food_macro(food, "carbs_g") * quantity_g / 100, 1),
        "fat_g": round(food_macro(food, "fat_g") * quantity_g / 100, 1),
    }


def calculate_template_quantity(food, role, remaining_targets, original_targets):
    target_key = f"{role}_g"
    macro_per_100g = food_macro(food, target_key)
    target_value = max(remaining_targets.get(target_key, 0), original_targets.get(target_key, 0) * 0.2)

    if macro_per_100g <= 0 or target_value <= 0:
        return 0

    quantity = target_value / macro_per_100g * 100
    if role == "fat":
        quantity = min(quantity, 45)
    elif role == "protein":
        quantity = min(quantity, 260)
    else:
        quantity = min(quantity, 240)
    return round(max(quantity, 10))


def score_suggestion(totals, targets):
    score = 0
    for key in MACRO_KEYS:
        target = targets.get(key, 0)
        if target <= 0:
            continue
        score += abs((totals.get(key, 0) - target) / target)
    return round(score, 3)


def build_menu_suggestion(template, targets):
    remaining_targets = dict(targets)
    suggestion_items = []

    for role, food_name in template["foods"]:
        food = find_food_by_name(food_name)
        if not food:
            return None

        quantity_g = calculate_template_quantity(food, role, remaining_targets, targets)
        if quantity_g <= 0:
            continue

        totals = calculate_food_totals(food, quantity_g)
        suggestion_items.append(
            {
                "quantity_g": quantity_g,
                "calories_kcal": totals["calories_kcal"],
                "protein_g": totals["protein_g"],
                "carbs_g": totals["carbs_g"],
                "fat_g": totals["fat_g"],
                "product": food.to_nutrition_product(),
            }
        )
        for key in MACRO_KEYS:
            remaining_targets[key] = max(remaining_targets.get(key, 0) - totals[key], 0)

    totals = {
        key: round(sum(item[key] for item in suggestion_items), 1)
        for key in MACRO_KEYS
    }

    return {
        "title": template["title"],
        "items": suggestion_items,
        "totals": totals,
        "target": targets,
        "score": score_suggestion(totals, targets),
    }


@nutrition_bp.get("/search")
@jwt_required()
def search_products():
    query = (request.args.get("q") or "").strip()

    if len(query) < 2:
        return jsonify({"message": "Search query must be at least 2 characters long"}), 400

    mythos_products = search_mythos_foods(query)
    if mythos_products:
        return jsonify({"products": [food.to_nutrition_product() for food in mythos_products]})

    products = []
    seen_products = set()

    for active_query in build_query_variants(query):
        for host in ["es.openfoodfacts.org", "world.openfoodfacts.org"]:
            try:
                payload = fetch_open_food_facts(active_query, host)
                for product in payload.get("products", []):
                    identity = product_identity(product)
                    if identity in seen_products:
                        continue
                    seen_products.add(identity)
                    products.append(product)
                    if len(products) >= MAX_PRODUCTS:
                        break
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
                continue
            if len(products) >= MAX_PRODUCTS:
                break
        if len(products) >= MAX_PRODUCTS:
            break

    return jsonify({"products": [normalize_product(product) for product in products]})


@nutrition_bp.get("/foods")
@jwt_required()
def list_foods():
    query = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    foods_query = Food.query.filter(Food.is_active.is_(True))

    if query:
        pattern = f"%{query}%"
        foods_query = foods_query.filter(
            or_(
                Food.name.ilike(pattern),
                Food.subcategory.ilike(pattern),
                Food.presentation.ilike(pattern),
            )
        )
    if category:
        foods_query = foods_query.filter(Food.category == category)

    foods = foods_query.order_by(Food.category.asc(), Food.name.asc()).limit(200).all()
    return jsonify({"foods": [food.to_dict() for food in foods]})


@nutrition_bp.post("/suggestions")
@jwt_required()
def suggest_meal_options():
    payload = request.get_json(silent=True) or {}
    targets = {
        "calories_kcal": parse_target(payload.get("target_calories_kcal")),
        "protein_g": parse_target(payload.get("target_protein_g")),
        "carbs_g": parse_target(payload.get("target_carbs_g")),
        "fat_g": parse_target(payload.get("target_fat_g")),
    }

    if not any(targets.values()):
        return jsonify({"message": "Define macros o calorias para poder generar sugerencias."}), 400

    suggestions = []
    for template in MEAL_TEMPLATES:
        suggestion = build_menu_suggestion(template, targets)
        if suggestion and suggestion["items"]:
            suggestions.append(suggestion)

    suggestions = sorted(suggestions, key=lambda suggestion: suggestion["score"])[:3]
    return jsonify({"suggestions": suggestions})
