from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

nutrition_bp = Blueprint("nutrition", __name__)


@nutrition_bp.get("/search")
@jwt_required()
def search_products():
    query = (request.args.get("q") or "").strip()

    if len(query) < 2:
        return jsonify({"message": "Search query must be at least 2 characters long"}), 400

    params = urlencode(
        {
            "search_terms": query,
            "search_simple": "1",
            "action": "process",
            "json": "1",
            "page_size": "12",
            "fields": "code,product_name,brands,nutriscore_grade,image_front_small_url,nutriments",
        }
    )
    open_food_facts_url = f"https://world.openfoodfacts.org/cgi/search.pl?{params}"
    outbound_request = Request(
        open_food_facts_url,
        headers={"User-Agent": "MythosApp/1.0 (contact: support@mythos.local)"},
    )

    try:
        with urlopen(outbound_request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return jsonify({"message": "No se pudo consultar la base nutricional."}), 502

    return jsonify({"products": payload.get("products", [])})
