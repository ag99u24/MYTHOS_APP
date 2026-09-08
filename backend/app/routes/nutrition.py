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


@nutrition_bp.get("/search")
@jwt_required()
def search_products():
    query = (request.args.get("q") or "").strip()

    if len(query) < 2:
        return jsonify({"message": "Search query must be at least 2 characters long"}), 400

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
