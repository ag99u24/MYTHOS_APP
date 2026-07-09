from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt, migrate
from app.routes.auth import auth_bp
from app.routes.plans import plans_bp
from app.routes.progress import progress_bp
from app.routes.users import users_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}})
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(plans_bp, url_prefix="/api/plans")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok", "service": "mythos-api"})

    @app.cli.command("init-db")
    def init_db():
        import app.models  # noqa: F401

        db.create_all()
        print("Database tables created.")

    return app
