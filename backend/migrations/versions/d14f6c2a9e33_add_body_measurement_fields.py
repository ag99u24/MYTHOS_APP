"""add body measurement fields

Revision ID: d14f6c2a9e33
Revises: b58b7f1c6d24
Create Date: 2026-08-27 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d14f6c2a9e33"
down_revision = "b58b7f1c6d24"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("progress_entries") as batch_op:
        batch_op.add_column(sa.Column("measured_by_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("muscle_percentage", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("visceral_fat", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("chest_cm", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("waist_cm", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("hip_cm", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("arm_cm", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("thigh_cm", sa.Float(), nullable=True))
        batch_op.create_foreign_key("fk_progress_entries_measured_by_id_users", "users", ["measured_by_id"], ["id"])


def downgrade():
    with op.batch_alter_table("progress_entries") as batch_op:
        batch_op.drop_constraint("fk_progress_entries_measured_by_id_users", type_="foreignkey")
        batch_op.drop_column("thigh_cm")
        batch_op.drop_column("arm_cm")
        batch_op.drop_column("hip_cm")
        batch_op.drop_column("waist_cm")
        batch_op.drop_column("chest_cm")
        batch_op.drop_column("visceral_fat")
        batch_op.drop_column("muscle_percentage")
        batch_op.drop_column("measured_by_id")
