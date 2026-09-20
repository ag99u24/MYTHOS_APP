"""add exercise patterns and plan link

Revision ID: e49a0b6c3d12
Revises: d38f9a5b2c01
Create Date: 2026-09-21 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e49a0b6c3d12"
down_revision = "d38f9a5b2c01"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("exercises") as batch_op:
        batch_op.add_column(sa.Column("pattern", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("movement_family", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("substitution_group", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("option_number", sa.Integer(), nullable=True))
        batch_op.create_index("ix_exercises_pattern", ["pattern"], unique=False)
        batch_op.create_index("ix_exercises_substitution_group", ["substitution_group"], unique=False)

    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.add_column(sa.Column("exercise_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_plan_items_exercise_id_exercises", "exercises", ["exercise_id"], ["id"])


def downgrade():
    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.drop_constraint("fk_plan_items_exercise_id_exercises", type_="foreignkey")
        batch_op.drop_column("exercise_id")

    with op.batch_alter_table("exercises") as batch_op:
        batch_op.drop_index("ix_exercises_substitution_group")
        batch_op.drop_index("ix_exercises_pattern")
        batch_op.drop_column("option_number")
        batch_op.drop_column("substitution_group")
        batch_op.drop_column("movement_family")
        batch_op.drop_column("pattern")
