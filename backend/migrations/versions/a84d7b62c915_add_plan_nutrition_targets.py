"""add plan nutrition targets

Revision ID: a84d7b62c915
Revises: f3c9a7d2b681
Create Date: 2026-09-14 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a84d7b62c915"
down_revision = "f3c9a7d2b681"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("plans") as batch_op:
        batch_op.add_column(sa.Column("target_calories_kcal", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_protein_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_carbs_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_fat_g", sa.Float(), nullable=True))

    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.add_column(sa.Column("target_calories_kcal", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_protein_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_carbs_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("target_fat_g", sa.Float(), nullable=True))


def downgrade():
    with op.batch_alter_table("plan_items") as batch_op:
        batch_op.drop_column("target_fat_g")
        batch_op.drop_column("target_carbs_g")
        batch_op.drop_column("target_protein_g")
        batch_op.drop_column("target_calories_kcal")

    with op.batch_alter_table("plans") as batch_op:
        batch_op.drop_column("target_fat_g")
        batch_op.drop_column("target_carbs_g")
        batch_op.drop_column("target_protein_g")
        batch_op.drop_column("target_calories_kcal")
