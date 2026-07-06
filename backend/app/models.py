from datetime import datetime, timezone
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="client")
    specialty = db.Column(db.String(120))
    goal = db.Column(db.String(160))
    avatar_url = db.Column(db.String(500))

    clients = db.relationship(
        "ClientAssignment",
        foreign_keys="ClientAssignment.professional_id",
        back_populates="professional",
        cascade="all, delete-orphan",
    )
    professionals = db.relationship(
        "ClientAssignment",
        foreign_keys="ClientAssignment.client_id",
        back_populates="client",
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "specialty": self.specialty,
            "goal": self.goal,
            "avatar_url": self.avatar_url,
        }


class ClientAssignment(db.Model, TimestampMixin):
    __tablename__ = "client_assignments"

    id = db.Column(db.Integer, primary_key=True)
    professional_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="active")

    professional = db.relationship("User", foreign_keys=[professional_id], back_populates="clients")
    client = db.relationship("User", foreign_keys=[client_id], back_populates="professionals")


class Plan(db.Model, TimestampMixin):
    __tablename__ = "plans"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(40), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="draft")
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    professional_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    professional = db.relationship("User", foreign_keys=[professional_id])
    client = db.relationship("User", foreign_keys=[client_id])
    items = db.relationship("PlanItem", back_populates="plan", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "professional_id": self.professional_id,
            "client_id": self.client_id,
            "items": [item.to_dict() for item in self.items],
        }


class PlanItem(db.Model, TimestampMixin):
    __tablename__ = "plan_items"

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id"), nullable=False)
    day = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    details = db.Column(db.Text)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    plan = db.relationship("Plan", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "day": self.day,
            "title": self.title,
            "details": self.details,
            "sort_order": self.sort_order,
        }


class ProgressEntry(db.Model, TimestampMixin):
    __tablename__ = "progress_entries"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    weight = db.Column(db.Float)
    body_fat = db.Column(db.Float)
    mood = db.Column(db.String(40))
    notes = db.Column(db.Text)
    photo_url = db.Column(db.String(500))

    client = db.relationship("User", foreign_keys=[client_id])

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "weight": self.weight,
            "body_fat": self.body_fat,
            "mood": self.mood,
            "notes": self.notes,
            "photo_url": self.photo_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(db.Model, TimestampMixin):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(80), unique=True, nullable=False, default=lambda: uuid4().hex)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    used_at = db.Column(db.DateTime)

    user = db.relationship("User")
