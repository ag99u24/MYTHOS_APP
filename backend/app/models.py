from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="client")
    specialty: Mapped[Optional[str]] = mapped_column(String(120))
    goal: Mapped[Optional[str]] = mapped_column(String(160))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    clients: Mapped[list["ClientAssignment"]] = relationship(
        "ClientAssignment",
        foreign_keys="ClientAssignment.professional_id",
        back_populates="professional",
        cascade="all, delete-orphan",
    )
    professionals: Mapped[list["ClientAssignment"]] = relationship(
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    professional_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")

    professional: Mapped["User"] = relationship("User", foreign_keys=[professional_id], back_populates="clients")
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id], back_populates="professionals")


class Plan(db.Model, TimestampMixin):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    professional_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    professional: Mapped["User"] = relationship("User", foreign_keys=[professional_id])
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])
    items: Mapped[list["PlanItem"]] = relationship("PlanItem", back_populates="plan", cascade="all, delete-orphan")

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

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    day: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    plan: Mapped["Plan"] = relationship("Plan", back_populates="items")

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

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    weight: Mapped[Optional[float]] = mapped_column(Float)
    body_fat: Mapped[Optional[float]] = mapped_column(Float)
    mood: Mapped[Optional[str]] = mapped_column(String(40))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500))

    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])

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


class WorkoutEntry(db.Model, TimestampMixin):
    __tablename__ = "workout_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    workout_type: Mapped[Optional[str]] = mapped_column(String(80))
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    intensity: Mapped[Optional[str]] = mapped_column(String(40))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "title": self.title,
            "workout_type": self.workout_type,
            "duration_minutes": self.duration_minutes,
            "intensity": self.intensity,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DietEntry(db.Model, TimestampMixin):
    __tablename__ = "diet_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    adherence_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    meals_completed: Mapped[Optional[int]] = mapped_column(Integer)
    total_meals: Mapped[Optional[int]] = mapped_column(Integer)
    water_liters: Mapped[Optional[float]] = mapped_column(Float)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "adherence_percentage": self.adherence_percentage,
            "meals_completed": self.meals_completed,
            "total_meals": self.total_meals,
            "water_liters": self.water_liters,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(db.Model, TimestampMixin):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, default=lambda: uuid4().hex)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    user: Mapped["User"] = relationship("User")
