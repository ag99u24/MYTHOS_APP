import json
import unittest
from unittest.mock import patch

from app import create_app
from app.config import TestConfig
from app.extensions import db


class ConfigTestCase(unittest.TestCase):
    def test_production_rejects_default_security_values(self):
        class UnsafeProductionConfig(TestConfig):
            TESTING = False
            APP_ENV = "production"
            SECRET_KEY = "dev-secret-change-me"
            JWT_SECRET_KEY = "dev-jwt-secret-change-me"
            JWT_COOKIE_SECURE = False
            JWT_COOKIE_SAMESITE = "Lax"
            ALLOW_RESET_TOKEN_RESPONSE = True

        with self.assertRaises(RuntimeError) as context:
            create_app(UnsafeProductionConfig)

        message = str(context.exception)
        self.assertIn("SECRET_KEY", message)
        self.assertIn("JWT_SECRET_KEY", message)
        self.assertIn("ALLOW_RESET_TOKEN_RESPONSE", message)
        self.assertIn("JWT_COOKIE_SECURE", message)
        self.assertIn("JWT_COOKIE_SAMESITE", message)

    def test_production_accepts_secure_values(self):
        class SafeProductionConfig(TestConfig):
            TESTING = False
            APP_ENV = "production"
            SECRET_KEY = "secure-secret-key-with-more-than-enough-length"
            JWT_SECRET_KEY = "secure-jwt-secret-with-more-than-enough-length"
            JWT_COOKIE_SECURE = True
            JWT_COOKIE_SAMESITE = "None"
            ALLOW_RESET_TOKEN_RESPONSE = False

        app = create_app(SafeProductionConfig)
        self.assertEqual(app.config["APP_ENV"], "production")


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def register(self, email, role, name=None):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": name or email.split("@")[0].title(),
                "email": email,
                "password": "password123",
                "role": role,
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()

    def auth_header(self, session):
        return {"Authorization": f"Bearer {session['access_token']}"}

    def test_health_check_reports_database_status(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "mythos-api")
        self.assertEqual(payload["checks"]["database"], "ok")

    def test_api_responses_include_security_headers(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertEqual(response.headers["Referrer-Policy"], "strict-origin-when-cross-origin")
        self.assertEqual(response.headers["Permissions-Policy"], "camera=(), microphone=(), geolocation=()")

    def test_register_login_and_password_reset(self):
        invalid_register_response = self.client.post(
            "/api/auth/register",
            json={"name": "Invalid Email", "email": "invalid-email", "password": "password123", "role": "client"},
        )
        self.assertEqual(invalid_register_response.status_code, 400)

        self.register("client@example.com", "client", "Client One")

        login_response = self.client.post(
            "/api/auth/login",
            json={"email": "client@example.com", "password": "password123"},
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access_token", login_response.get_json())

        forgot_response = self.client.post("/api/auth/forgot-password", json={"email": "client@example.com"})
        self.assertEqual(forgot_response.status_code, 200)
        reset_token = forgot_response.get_json()["reset_token"]

        reset_response = self.client.post(
            "/api/auth/reset-password",
            json={"token": reset_token, "password": "newpassword123"},
        )
        self.assertEqual(reset_response.status_code, 200)

        old_login_response = self.client.post(
            "/api/auth/login",
            json={"email": "client@example.com", "password": "password123"},
        )
        self.assertEqual(old_login_response.status_code, 401)

        new_login_response = self.client.post(
            "/api/auth/login",
            json={"email": "client@example.com", "password": "newpassword123"},
        )
        self.assertEqual(new_login_response.status_code, 200)

    def test_authenticated_user_can_change_password(self):
        session = self.register("change-password@example.com", "client", "Password Client")

        wrong_current_response = self.client.post(
            "/api/auth/change-password",
            json={"current_password": "wrongpassword", "new_password": "updatedpassword123"},
            headers=self.auth_header(session),
        )
        self.assertEqual(wrong_current_response.status_code, 401)

        change_response = self.client.post(
            "/api/auth/change-password",
            json={"current_password": "password123", "new_password": "updatedpassword123"},
            headers=self.auth_header(session),
        )
        self.assertEqual(change_response.status_code, 200)

        old_login_response = self.client.post(
            "/api/auth/login",
            json={"email": "change-password@example.com", "password": "password123"},
        )
        self.assertEqual(old_login_response.status_code, 401)

        new_login_response = self.client.post(
            "/api/auth/login",
            json={"email": "change-password@example.com", "password": "updatedpassword123"},
        )
        self.assertEqual(new_login_response.status_code, 200)

    def test_authenticated_user_can_update_email_when_unique(self):
        session = self.register("profile-email@example.com", "client", "Profile Client")
        self.register("existing-email@example.com", "client", "Existing Client")

        duplicate_response = self.client.patch(
            "/api/users/me",
            json={"email": "existing-email@example.com"},
            headers=self.auth_header(session),
        )
        self.assertEqual(duplicate_response.status_code, 409)

        invalid_response = self.client.patch(
            "/api/users/me",
            json={"email": "invalid-email"},
            headers=self.auth_header(session),
        )
        self.assertEqual(invalid_response.status_code, 400)

        update_response = self.client.patch(
            "/api/users/me",
            json={"email": "updated-profile@example.com", "name": "Profile Updated"},
            headers=self.auth_header(session),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["user"]["email"], "updated-profile@example.com")

        login_response = self.client.post(
            "/api/auth/login",
            json={"email": "updated-profile@example.com", "password": "password123"},
        )
        self.assertEqual(login_response.status_code, 200)

    def test_professional_can_only_view_assigned_client_tracking(self):
        professional = self.register("pro@example.com", "professional", "Coach")
        assigned_client = self.register("assigned@example.com", "client", "Assigned Client")
        other_client = self.register("other@example.com", "client", "Other Client")

        assign_response = self.client.post(
            "/api/users/clients",
            json={"email": "assigned@example.com"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(assign_response.status_code, 201)

        progress_response = self.client.post(
            "/api/progress",
            json={"client_id": assigned_client["user"]["id"], "weight": 80.5, "body_fat": 18, "mood": "Bien"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(progress_response.status_code, 201)

        assigned_progress_response = self.client.get(
            f"/api/progress?client_id={assigned_client['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(assigned_progress_response.status_code, 200)
        self.assertEqual(len(assigned_progress_response.get_json()["progress"]), 1)

        forbidden_progress_response = self.client.get(
            f"/api/progress?client_id={other_client['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(forbidden_progress_response.status_code, 404)

    def test_professional_can_unassign_client(self):
        professional = self.register("remove-pro@example.com", "professional", "Coach")
        assigned_client = self.register("remove-client@example.com", "client", "Assigned Client")

        assign_response = self.client.post(
            "/api/users/clients",
            json={"email": "remove-client@example.com"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(assign_response.status_code, 201)

        remove_response = self.client.delete(
            f"/api/users/clients/{assigned_client['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(remove_response.status_code, 200)

        clients_response = self.client.get("/api/users/clients", headers=self.auth_header(professional))
        self.assertEqual(clients_response.status_code, 200)
        self.assertEqual(clients_response.get_json()["clients"], [])

        progress_response = self.client.get(
            f"/api/progress?client_id={assigned_client['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(progress_response.status_code, 404)

    def test_professional_can_search_assigned_clients(self):
        professional = self.register("search-pro@example.com", "professional", "Coach")
        self.register("ana-client@example.com", "client", "Ana Fuerza")
        self.register("luis-client@example.com", "client", "Luis Nutricion")

        for email in ["ana-client@example.com", "luis-client@example.com"]:
            assign_response = self.client.post(
                "/api/users/clients",
                json={"email": email},
                headers=self.auth_header(professional),
            )
            self.assertEqual(assign_response.status_code, 201)

        search_response = self.client.get(
            "/api/users/clients?q=ana",
            headers=self.auth_header(professional),
        )
        self.assertEqual(search_response.status_code, 200)
        clients = search_response.get_json()["clients"]
        self.assertEqual(len(clients), 1)
        self.assertEqual(clients[0]["email"], "ana-client@example.com")

    def test_professional_can_view_assigned_client_summary(self):
        professional = self.register("summary-pro@example.com", "professional", "Coach")
        client_session = self.register("summary-client@example.com", "client", "Summary Client")
        other_client = self.register("summary-other@example.com", "client", "Other Client")

        assign_response = self.client.post(
            "/api/users/clients",
            json={"email": "summary-client@example.com"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(assign_response.status_code, 201)

        plan_response = self.client.post(
            "/api/plans",
            json={
                "title": "Plan resumen",
                "category": "Mixto",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "Lunes", "title": "Bloque base"}],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(plan_response.status_code, 201)

        progress_response = self.client.post(
            "/api/progress",
            json={"client_id": client_session["user"]["id"], "weight": 78, "mood": "Bien"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(progress_response.status_code, 201)

        summary_response = self.client.get(
            f"/api/users/clients/{client_session['user']['id']}/summary",
            headers=self.auth_header(professional),
        )
        self.assertEqual(summary_response.status_code, 200)
        summary = summary_response.get_json()
        self.assertEqual(summary["client"]["email"], "summary-client@example.com")
        self.assertEqual(len(summary["plans"]), 1)
        self.assertEqual(len(summary["progress"]), 1)

        forbidden_response = self.client.get(
            f"/api/users/clients/{other_client['user']['id']}/summary",
            headers=self.auth_header(professional),
        )
        self.assertEqual(forbidden_response.status_code, 404)

    def test_list_endpoints_return_pagination_meta(self):
        client_session = self.register("pagination@example.com", "client", "Pagination Client")

        for index in range(3):
            response = self.client.post(
                "/api/workouts",
                json={"title": f"Workout {index}", "duration_minutes": 30 + index},
                headers=self.auth_header(client_session),
            )
            self.assertEqual(response.status_code, 201)

        list_response = self.client.get("/api/workouts?page=1&per_page=2", headers=self.auth_header(client_session))
        self.assertEqual(list_response.status_code, 200)
        payload = list_response.get_json()
        self.assertEqual(len(payload["workouts"]), 2)
        self.assertEqual(payload["meta"]["total"], 3)
        self.assertEqual(payload["meta"]["pages"], 2)
        self.assertTrue(payload["meta"]["has_next"])

    def test_client_can_update_and_delete_tracking_entries(self):
        client_session = self.register("tracking@example.com", "client", "Tracking Client")

        workout_response = self.client.post(
            "/api/workouts",
            json={"title": "Pierna", "duration_minutes": 45, "intensity": "Media"},
            headers=self.auth_header(client_session),
        )
        self.assertEqual(workout_response.status_code, 201)
        workout_id = workout_response.get_json()["workout"]["id"]

        update_response = self.client.patch(
            f"/api/workouts/{workout_id}",
            json={"title": "Pierna y core", "duration_minutes": 55},
            headers=self.auth_header(client_session),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["workout"]["title"], "Pierna y core")

        delete_response = self.client.delete(
            f"/api/workouts/{workout_id}",
            headers=self.auth_header(client_session),
        )
        self.assertEqual(delete_response.status_code, 200)

        list_response = self.client.get("/api/workouts", headers=self.auth_header(client_session))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.get_json()["workouts"], [])

    def test_professional_can_manage_body_measurements_for_assigned_client(self):
        professional = self.register("measure-pro@example.com", "professional", "Coach")
        client_session = self.register("measure-client@example.com", "client", "Measured Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "measure-client@example.com"},
            headers=self.auth_header(professional),
        )

        create_response = self.client.post(
            "/api/progress",
            json={
                "client_id": client_session["user"]["id"],
                "weight": 79.4,
                "body_fat": 17.5,
                "muscle_percentage": 42.3,
                "visceral_fat": 7,
                "chest_cm": 101,
                "waist_cm": 83,
                "hip_cm": 96,
                "arm_cm": 35,
                "thigh_cm": 57,
                "mood": "Bien",
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(create_response.status_code, 201)
        measurement = create_response.get_json()["progress"]
        self.assertEqual(measurement["client_id"], client_session["user"]["id"])
        self.assertEqual(measurement["measured_by_id"], professional["user"]["id"])
        self.assertEqual(measurement["muscle_percentage"], 42.3)
        measurement_id = measurement["id"]

        update_response = self.client.patch(
            f"/api/progress/{measurement_id}",
            json={"weight": 78.8, "waist_cm": 81.5},
            headers=self.auth_header(professional),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["progress"]["weight"], 78.8)
        self.assertEqual(update_response.get_json()["progress"]["waist_cm"], 81.5)

        delete_response = self.client.delete(
            f"/api/progress/{measurement_id}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(delete_response.status_code, 200)

    def test_client_cannot_create_body_measurements(self):
        client_session = self.register("client-measure-forbidden@example.com", "client", "Client")
        response = self.client.post(
            "/api/progress",
            json={"client_id": client_session["user"]["id"], "weight": 80},
            headers=self.auth_header(client_session),
        )
        self.assertEqual(response.status_code, 403)

    def test_professional_cannot_create_tracking_entry(self):
        professional = self.register("coach@example.com", "professional", "Coach")
        response = self.client.post(
            "/api/diet",
            json={"adherence_percentage": 90},
            headers=self.auth_header(professional),
        )
        self.assertEqual(response.status_code, 403)

    def test_professional_can_filter_plans(self):
        professional = self.register("plan-pro@example.com", "professional", "Coach")
        client_session = self.register("plan-client@example.com", "client", "Plan Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "plan-client@example.com"},
            headers=self.auth_header(professional),
        )

        training_response = self.client.post(
            "/api/plans",
            json={
                "title": "Fuerza base",
                "category": "Entrenamiento",
                "status": "draft",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "Lunes", "title": "Pierna"}],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(training_response.status_code, 201)

        nutrition_response = self.client.post(
            "/api/plans",
            json={
                "title": "Deficit controlado",
                "category": "Nutricion",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "General", "title": "Proteina diaria"}],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(nutrition_response.status_code, 201)

        invalid_status_response = self.client.post(
            "/api/plans",
            json={
                "title": "Estado invalido",
                "category": "Mixto",
                "status": "paused",
                "client_id": client_session["user"]["id"],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(invalid_status_response.status_code, 400)

        filtered_response = self.client.get(
            f"/api/plans?status=active&category=Nutricion&client_id={client_session['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(filtered_response.status_code, 200)
        filtered_plans = filtered_response.get_json()["plans"]
        self.assertEqual(len(filtered_plans), 1)
        self.assertEqual(filtered_plans[0]["title"], "Deficit controlado")

    def test_assigned_training_requires_items_and_is_visible_to_client(self):
        professional = self.register("assigned-training-pro@example.com", "professional", "Coach")
        client_session = self.register("assigned-training-client@example.com", "client", "Training Client")

        assign_response = self.client.post(
            "/api/users/clients",
            json={"email": "assigned-training-client@example.com"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(assign_response.status_code, 201)

        empty_training_response = self.client.post(
            "/api/plans",
            json={
                "title": "Entrenamiento sin bloques",
                "category": "Entrenamiento",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(empty_training_response.status_code, 400)

        training_response = self.client.post(
            "/api/plans",
            json={
                "title": "Entrenamiento visible",
                "category": "Entrenamiento",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "Lunes", "title": "Sentadilla", "details": "4x8 con descanso de 90s"}],
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(training_response.status_code, 201)
        self.assertEqual(len(training_response.get_json()["plan"]["items"]), 1)

        client_plans_response = self.client.get(
            "/api/plans?category=Entrenamiento",
            headers=self.auth_header(client_session),
        )
        self.assertEqual(client_plans_response.status_code, 200)
        client_plans = client_plans_response.get_json()["plans"]
        self.assertEqual(len(client_plans), 1)
        self.assertEqual(client_plans[0]["title"], "Entrenamiento visible")
        self.assertEqual(client_plans[0]["items"][0]["title"], "Sentadilla")

    def test_client_can_track_assigned_training_item(self):
        professional = self.register("track-training-pro@example.com", "professional", "Coach")
        client_session = self.register("track-training-client@example.com", "client", "Training Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "track-training-client@example.com"},
            headers=self.auth_header(professional),
        )
        training_response = self.client.post(
            "/api/plans",
            json={
                "title": "Fuerza base",
                "category": "Entrenamiento",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "Lunes", "title": "Press banca", "details": "4x8"}],
            },
            headers=self.auth_header(professional),
        )
        plan_item_id = training_response.get_json()["plan"]["items"][0]["id"]

        workout_response = self.client.post(
            "/api/workouts",
            json={
                "plan_item_id": plan_item_id,
                "title": "Press banca",
                "workout_type": "Plan asignado",
                "sets_completed": 4,
                "reps_completed": 32,
                "intensity": "Media",
            },
            headers=self.auth_header(client_session),
        )

        self.assertEqual(workout_response.status_code, 201)
        workout = workout_response.get_json()["workout"]
        self.assertEqual(workout["plan_item_id"], plan_item_id)
        self.assertEqual(workout["sets_completed"], 4)
        self.assertEqual(workout["reps_completed"], 32)

    def test_client_can_track_assigned_nutrition_item(self):
        professional = self.register("track-diet-pro@example.com", "professional", "Coach")
        client_session = self.register("track-diet-client@example.com", "client", "Nutrition Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "track-diet-client@example.com"},
            headers=self.auth_header(professional),
        )
        nutrition_response = self.client.post(
            "/api/plans",
            json={
                "title": "Dieta rendimiento",
                "category": "Nutricion",
                "status": "active",
                "client_id": client_session["user"]["id"],
                "items": [{"day": "Lunes", "title": "Desayuno", "details": "Avena, yogur y fruta"}],
            },
            headers=self.auth_header(professional),
        )
        plan_item_id = nutrition_response.get_json()["plan"]["items"][0]["id"]

        diet_response = self.client.post(
            "/api/diet",
            json={
                "plan_item_id": plan_item_id,
                "recommended_meal": "Desayuno",
                "consumed_food": "Avena (80g), Yogur griego (100g)",
                "meal_type": "desayuno",
                "consumed_date": "2026-09-01",
                "quantity_g": 180,
                "calories_kcal": 216,
                "protein_g": 14.4,
                "carbs_g": 32.4,
                "fat_g": 3.6,
                "meals_completed": 1,
                "total_meals": 1,
            },
            headers=self.auth_header(client_session),
        )

        self.assertEqual(diet_response.status_code, 201)
        diet = diet_response.get_json()["diet"]
        self.assertEqual(diet["plan_item_id"], plan_item_id)
        self.assertEqual(diet["recommended_meal"], "Desayuno")
        self.assertEqual(diet["consumed_food"], "Avena (80g), Yogur griego (100g)")
        self.assertEqual(diet["adherence_percentage"], 50)
        self.assertEqual(diet["meal_type"], "desayuno")
        self.assertEqual(diet["consumed_date"], "2026-09-01")
        self.assertEqual(diet["quantity_g"], 180)
        self.assertEqual(diet["calories_kcal"], 216)
        self.assertEqual(diet["protein_g"], 14.4)

    def test_nutrition_search_uses_spanish_results_and_normalizes_names(self):
        client_session = self.register("nutrition-search@example.com", "client", "Nutrition Search")
        payload = {
            "products": [
                {
                    "code": "123",
                    "product_name_es": "Yogur griego natural",
                    "brands": "Demo",
                    "nutrition_grades": "b",
                    "nutriments": {"proteins_100g": 8.5},
                }
            ]
        }

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(payload).encode("utf-8")

        with patch("app.routes.nutrition.urlopen", return_value=FakeResponse()):
            response = self.client.get(
                "/api/nutrition/search?q=yogur",
                headers=self.auth_header(client_session),
            )

        self.assertEqual(response.status_code, 200)
        product = response.get_json()["products"][0]
        self.assertEqual(product["product_name"], "Yogur griego natural")
        self.assertEqual(product["nutriscore_grade"], "b")
        self.assertEqual(product["nutrition"]["protein_g_100g"], 8.5)

    def test_professional_can_create_session_for_assigned_client(self):
        professional = self.register("session-pro@example.com", "professional", "Coach")
        client_session = self.register("session-client@example.com", "client", "Session Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "session-client@example.com"},
            headers=self.auth_header(professional),
        )

        create_response = self.client.post(
            "/api/sessions",
            json={
                "title": "Revision semanal",
                "client_id": client_session["user"]["id"],
                "scheduled_at": "2026-07-20T10:00:00",
                "duration_minutes": 45,
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(create_response.status_code, 201)
        session_id = create_response.get_json()["session"]["id"]

        invalid_status_response = self.client.post(
            "/api/sessions",
            json={
                "title": "Estado erroneo",
                "client_id": client_session["user"]["id"],
                "scheduled_at": "2026-07-21T10:00:00",
                "status": "unknown",
            },
            headers=self.auth_header(professional),
        )
        self.assertEqual(invalid_status_response.status_code, 400)

        update_response = self.client.patch(
            f"/api/sessions/{session_id}",
            json={"status": "completed"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["session"]["status"], "completed")

        client_list_response = self.client.get("/api/sessions", headers=self.auth_header(client_session))
        self.assertEqual(client_list_response.status_code, 200)
        self.assertEqual(len(client_list_response.get_json()["sessions"]), 1)
        self.assertEqual(client_list_response.get_json()["sessions"][0]["status"], "completed")

        filtered_response = self.client.get(
            "/api/sessions?status=completed",
            headers=self.auth_header(client_session),
        )
        self.assertEqual(filtered_response.status_code, 200)
        self.assertEqual(len(filtered_response.get_json()["sessions"]), 1)

        empty_filtered_response = self.client.get(
            "/api/sessions?status=scheduled",
            headers=self.auth_header(client_session),
        )
        self.assertEqual(empty_filtered_response.status_code, 200)
        self.assertEqual(empty_filtered_response.get_json()["sessions"], [])

    def test_assigned_professional_and_client_can_exchange_messages(self):
        professional = self.register("message-pro@example.com", "professional", "Coach")
        client_session = self.register("message-client@example.com", "client", "Message Client")

        self.client.post(
            "/api/users/clients",
            json={"email": "message-client@example.com"},
            headers=self.auth_header(professional),
        )

        professional_message_response = self.client.post(
            "/api/messages",
            json={"client_id": client_session["user"]["id"], "body": "Como te fue hoy?"},
            headers=self.auth_header(professional),
        )
        self.assertEqual(professional_message_response.status_code, 201)

        client_message_response = self.client.post(
            "/api/messages",
            json={"body": "Muy bien, complete el plan."},
            headers=self.auth_header(client_session),
        )
        self.assertEqual(client_message_response.status_code, 201)

        long_message_response = self.client.post(
            "/api/messages",
            json={"body": "x" * 1001},
            headers=self.auth_header(client_session),
        )
        self.assertEqual(long_message_response.status_code, 400)

        unread_before_response = self.client.get(
            f"/api/messages/unread-count?client_id={client_session['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(unread_before_response.status_code, 200)
        self.assertEqual(unread_before_response.get_json()["unread_count"], 1)

        thread_response = self.client.get(
            f"/api/messages?client_id={client_session['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(thread_response.status_code, 200)
        self.assertEqual(len(thread_response.get_json()["messages"]), 2)

        unread_after_response = self.client.get(
            f"/api/messages/unread-count?client_id={client_session['user']['id']}",
            headers=self.auth_header(professional),
        )
        self.assertEqual(unread_after_response.status_code, 200)
        self.assertEqual(unread_after_response.get_json()["unread_count"], 0)

    def test_unread_preview_includes_sender(self):
        professional = self.register("preview-pro@example.com", "professional", "Coach Preview")
        client_session = self.register("preview-client@example.com", "client", "Client Preview")

        self.client.post(
            "/api/users/clients",
            json={"email": "preview-client@example.com"},
            headers=self.auth_header(professional),
        )
        self.client.post(
            "/api/messages",
            json={"body": "Tengo una duda con la rutina"},
            headers=self.auth_header(client_session),
        )

        preview_response = self.client.get(
            "/api/messages/unread-preview",
            headers=self.auth_header(professional),
        )

        self.assertEqual(preview_response.status_code, 200)
        preview = preview_response.get_json()
        self.assertEqual(preview["unread_count"], 1)
        self.assertEqual(preview["message"]["body"], "Tengo una duda con la rutina")
        self.assertEqual(preview["message"]["sender"]["name"], "Client Preview")


if __name__ == "__main__":
    unittest.main()
