"""add exercise catalog

Revision ID: d38f9a5b2c01
Revises: c27e8f4a1b90
Create Date: 2026-09-20 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d38f9a5b2c01"
down_revision = "c27e8f4a1b90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("muscle_group", sa.String(length=80), nullable=False),
        sa.Column("secondary_muscles", sa.String(length=180), nullable=True),
        sa.Column("equipment", sa.String(length=100), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("video_url", sa.String(length=500), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exercises_code"), "exercises", ["code"], unique=True)
    op.create_index(op.f("ix_exercises_name"), "exercises", ["name"], unique=False)
    op.create_index(op.f("ix_exercises_muscle_group"), "exercises", ["muscle_group"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_exercises_muscle_group"), table_name="exercises")
    op.drop_index(op.f("ix_exercises_name"), table_name="exercises")
    op.drop_index(op.f("ix_exercises_code"), table_name="exercises")
    op.drop_table("exercises")
