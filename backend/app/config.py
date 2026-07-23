import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL", "sqlite:///mythos.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)


def parse_origins(value):
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def validate_security_config(config):
    if config.get("APP_ENV") != "production":
        return

    errors = []
    default_values = {
        "SECRET_KEY": {"dev-secret-change-me", "replace-me-with-a-long-random-secret"},
        "JWT_SECRET_KEY": {"dev-jwt-secret-change-me", "replace-me-with-a-different-long-random-secret"},
    }

    for key, unsafe_values in default_values.items():
        value = config.get(key)
        if not value or value in unsafe_values or str(value).startswith("replace-me"):
            errors.append(f"{key} must be configured with a real secret")

    if config.get("ALLOW_RESET_TOKEN_RESPONSE"):
        errors.append("ALLOW_RESET_TOKEN_RESPONSE must be false in production")

    if not config.get("JWT_COOKIE_SECURE"):
        errors.append("JWT_COOKIE_SECURE must be true in production")

    if str(config.get("JWT_COOKIE_SAMESITE", "")).lower() != "none":
        errors.append("JWT_COOKIE_SAMESITE must be None in production")

    if errors:
        raise RuntimeError("Invalid production configuration: " + "; ".join(errors))


class Config:
    APP_ENV = os.getenv("APP_ENV", "development").lower()
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    FRONTEND_URLS = parse_origins(os.getenv("FRONTEND_URLS", f"{FRONTEND_URL},http://127.0.0.1:3000"))
    ALLOW_RESET_TOKEN_RESPONSE = os.getenv("ALLOW_RESET_TOKEN_RESPONSE", "true").lower() == "true"
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    MAIL_FROM = os.getenv("MAIL_FROM", "Mythos <onboarding@resend.dev>")


class TestConfig(Config):
    TESTING = True
    APP_ENV = "test"
    SECRET_KEY = "test-secret-key-with-enough-length"
    JWT_SECRET_KEY = "test-jwt-secret-key-with-enough-length"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_COOKIE_SECURE = False
    ALLOW_RESET_TOKEN_RESPONSE = True
    RESEND_API_KEY = None
