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

    return app
