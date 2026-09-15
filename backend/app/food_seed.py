import json
from pathlib import Path

from app.extensions import db
from app.models import Food


FOOD_DATA_PATH = Path(__file__).parent / "data" / "mythos_foods.json"


def load_food_seed_data(path=FOOD_DATA_PATH):
    with open(path, encoding="utf-8") as foods_file:
        return json.load(foods_file)


def seed_foods(path=FOOD_DATA_PATH):
    foods = load_food_seed_data(path)
    created = 0
    updated = 0

    for food_data in foods:
        food = Food.query.filter_by(code=food_data["code"]).first()
        if not food:
            food = Food(code=food_data["code"])
            db.session.add(food)
            created += 1
        else:
            updated += 1

        food.name = food_data["name"]
        food.category = food_data["category"]
        food.subcategory = food_data.get("subcategory")
        food.presentation = food_data.get("presentation")
        food.base_g = food_data.get("base_g") or 100
        food.calories_kcal_100g = food_data.get("calories_kcal_100g")
        food.protein_g_100g = food_data.get("protein_g_100g")
        food.carbs_g_100g = food_data.get("carbs_g_100g")
        food.fat_g_100g = food_data.get("fat_g_100g")
        food.source = food_data.get("source")
        food.is_active = True

    db.session.commit()
    return {"created": created, "updated": updated, "total": len(foods)}
