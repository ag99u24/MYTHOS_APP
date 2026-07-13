import unittest

from app import create_app
from app.config import TestConfig
from app.extensions import db


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

    def test_register_login_and_password_reset(self):
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
            json={"weight": 80.5, "body_fat": 18, "mood": "Bien"},
            headers=self.auth_header(assigned_client),
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

    def test_professional_cannot_create_tracking_entry(self):
        professional = self.register("coach@example.com", "professional", "Coach")
        response = self.client.post(
            "/api/diet",
            json={"adherence_percentage": 90},
            headers=self.auth_header(professional),
        )
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
