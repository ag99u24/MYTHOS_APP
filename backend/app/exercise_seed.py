import json
from pathlib import Path

from app.extensions import db
from app.models import Exercise


EXERCISE_DATA_PATH = Path(__file__).parent / "data" / "mythos_exercises.json"


def load_exercise_seed_data(path=EXERCISE_DATA_PATH):
    with open(path, encoding="utf-8") as exercises_file:
        return json.load(exercises_file)


def seed_exercises(path=EXERCISE_DATA_PATH):
    exercises = load_exercise_seed_data(path)
    created = 0
    updated = 0

    for exercise_data in exercises:
        exercise = Exercise.query.filter_by(code=exercise_data["code"]).first()
        if not exercise:
            exercise = Exercise(code=exercise_data["code"])
            db.session.add(exercise)
            created += 1
        else:
            updated += 1

        for field in [
            "name",
            "pattern",
            "movement_family",
            "substitution_group",
            "option_number",
            "muscle_group",
            "secondary_muscles",
            "equipment",
            "summary",
            "video_url",
        ]:
            setattr(exercise, field, exercise_data.get(field))
        exercise.is_active = exercise_data.get("is_active", True)

    db.session.commit()
    return {"created": created, "updated": updated, "total": len(exercises)}
