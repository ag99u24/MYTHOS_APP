from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

nutrition_bp = Blueprint("nutrition", __name__)
OFF_FIELDS = (
    "code,product_name,product_name_es,generic_name,generic_name_es,brands,"
    "nutriscore_grade,nutrition_grades,image_front_small_url,nutriments"
)
QUERY_FALLBACKS = {
    "pechuga de pollo": "chicken breast",
    "pollo": "chicken",
    "arroz": "rice",
    "avena": "oats",
    "huevo": "egg",
    "huevos": "eggs",
    "atun": "tuna",
    "atún": "tuna",
    "patata": "potato",
    "papa": "potato",
    "platano": "banana",
    "plátano": "banana",
}


def fetch_open_food_facts(query, host):
    params = urlencode(
        {
            "search_terms": query,
            "search_simple": "1",
            "action": "process",
            "json": "1",
            "page_size": "12",
            "lc": "es",
            "cc": "es",
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


@nutrition_bp.get("/search")
@jwt_required()
def search_products():
    query = (request.args.get("q") or "").strip()

    if len(query) < 2:
        return jsonify({"message": "Search query must be at least 2 characters long"}), 400

    products = []
    queries = [query]
    fallback_query = QUERY_FALLBACKS.get(query.lower())
    if fallback_query and fallback_query not in queries:
        queries.append(fallback_query)

    for active_query in queries:
        for host in ["es.openfoodfacts.org", "world.openfoodfacts.org"]:
            try:
                payload = fetch_open_food_facts(active_query, host)
                products = payload.get("products", [])
                if products:
                    break
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
                continue
        if products:
            break

    return jsonify({"products": [normalize_product(product) for product in products]})
