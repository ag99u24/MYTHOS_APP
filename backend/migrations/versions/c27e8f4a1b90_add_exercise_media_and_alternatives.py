"""add exercise media and alternatives

Revision ID: c27e8f4a1b90
Revises: a84d7b62c915
Create Date: 2026-09-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c27e8f4a1b90"
down_revision = "a84d7b62c915"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.add_column(sa.Column("exercise_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("video_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("exercise_alternatives", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.drop_column("exercise_alternatives")
        batch_op.drop_column("video_url")
        batch_op.drop_column("exercise_summary")
