from datetime import date, datetime, timedelta

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt, migrate
from app.routes.auth import auth_bp
from app.routes.diet import diet_bp
from app.routes.messages import messages_bp
from app.routes.nutrition import nutrition_bp
from app.routes.plans import plans_bp
from app.routes.progress import progress_bp
from app.routes.sessions import sessions_bp
from app.routes.users import users_bp
from app.routes.workouts import workouts_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URLS"]}}, supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(plans_bp, url_prefix="/api/plans")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(workouts_bp, url_prefix="/api/workouts")
    app.register_blueprint(diet_bp, url_prefix="/api/diet")
    app.register_blueprint(nutrition_bp, url_prefix="/api/nutrition")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(messages_bp, url_prefix="/api/messages")

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok", "service": "mythos-api"})

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"message": "Bad request"}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"message": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"message": "Internal server error"}), 500

    @app.cli.command("init-db")
    def init_db():
        import app.models  # noqa: F401

        db.create_all()
        print("Database tables created.")

    @app.cli.command("seed-demo")
    def seed_demo():
        from app.models import (
            ChatMessage,
            ClientAssignment,
            DietEntry,
            Plan,
            PlanItem,
            ProgressEntry,
            SessionAppointment,
            User,
            WorkoutEntry,
        )

        db.create_all()

        professional = User.query.filter_by(email="coach@mythos.demo").first()
        if not professional:
            professional = User(
                name="Laura Coach",
                email="coach@mythos.demo",
                role="professional",
                specialty="Entrenamiento funcional y nutricion",
            )
            professional.set_password("password123")
            db.session.add(professional)

        client = User.query.filter_by(email="cliente@mythos.demo").first()
        if not client:
            client = User(
                name="Alex Cliente",
                email="cliente@mythos.demo",
                role="client",
                goal="Ganar fuerza y mejorar adherencia nutricional",
            )
            client.set_password("password123")
            db.session.add(client)

        db.session.flush()

        assignment = ClientAssignment.query.filter_by(
            professional_id=professional.id,
            client_id=client.id,
        ).first()
        if not assignment:
            db.session.add(ClientAssignment(professional_id=professional.id, client_id=client.id))
        elif assignment.status != "active":
            assignment.status = "active"

        plan = Plan.query.filter_by(title="Plan fuerza y nutricion base", client_id=client.id).first()
        if not plan:
            plan = Plan(
                title="Plan fuerza y nutricion base",
                description="Rutina inicial combinada para mejorar fuerza, energia y adherencia.",
                category="Mixto",
                status="active",
                start_date=date.today(),
                end_date=date.today() + timedelta(days=28),
                professional_id=professional.id,
                client_id=client.id,
            )
            plan.items.extend(
                [
                    PlanItem(day="Lunes", title="Fuerza tren inferior", details="Sentadilla, peso muerto rumano y core.", sort_order=0),
                    PlanItem(day="Miercoles", title="Nutricion", details="Priorizar proteina en desayuno y comida.", sort_order=1),
                    PlanItem(day="Viernes", title="Fuerza tren superior", details="Empuje, traccion y movilidad escapular.", sort_order=2),
                ]
            )
            db.session.add(plan)

        if not ProgressEntry.query.filter_by(client_id=client.id).first():
            db.session.add(ProgressEntry(client_id=client.id, weight=78.4, body_fat=19.5, mood="Bien", notes="Primera semana completada."))

        if not WorkoutEntry.query.filter_by(client_id=client.id).first():
            db.session.add(WorkoutEntry(client_id=client.id, title="Sesion fuerza A", workout_type="Fuerza", duration_minutes=52, intensity="Media", notes="Buena tecnica general."))

        if not DietEntry.query.filter_by(client_id=client.id).first():
            db.session.add(DietEntry(client_id=client.id, adherence_percentage=86, meals_completed=18, total_meals=21, water_liters=2.3, notes="Buen cumplimiento entre semana."))

        if not SessionAppointment.query.filter_by(client_id=client.id, title="Revision semanal demo").first():
            db.session.add(
                SessionAppointment(
                    title="Revision semanal demo",
                    session_type="Revision",
                    status="scheduled",
                    scheduled_at=datetime.now() + timedelta(days=2),
                    duration_minutes=45,
                    meeting_url="https://meet.example.com/mythos-demo",
                    notes="Revisar sensaciones, adherencia y ajustes de cargas.",
                    professional_id=professional.id,
                    client_id=client.id,
                )
            )

        if not ChatMessage.query.filter_by(professional_id=professional.id, client_id=client.id).first():
            db.session.add(ChatMessage(professional_id=professional.id, client_id=client.id, sender_id=professional.id, body="Bienvenido a Mythos. Esta semana revisamos fuerza y adherencia."))
            db.session.add(ChatMessage(professional_id=professional.id, client_id=client.id, sender_id=client.id, body="Perfecto, ya registre mi primer entrenamiento."))

        db.session.commit()
        print("Demo data ready.")
        print("Professional: coach@mythos.demo / password123")
        print("Client: cliente@mythos.demo / password123")

    return app
