"""add nutrition log fields

Revision ID: e7a91d3c4b12
Revises: d14f6c2a9e33
Create Date: 2026-09-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e7a91d3c4b12"
down_revision = "d14f6c2a9e33"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("diet_entries") as batch_op:
        batch_op.add_column(sa.Column("meal_type", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("consumed_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("product_code", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("brand", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("quantity_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("calories_kcal", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("protein_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("carbs_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("fat_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("sugars_g", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("salt_g", sa.Float(), nullable=True))


def downgrade():
    with op.batch_alter_table("diet_entries") as batch_op:
        batch_op.drop_column("salt_g")
        batch_op.drop_column("sugars_g")
        batch_op.drop_column("fat_g")
        batch_op.drop_column("carbs_g")
        batch_op.drop_column("protein_g")
        batch_op.drop_column("calories_kcal")
        batch_op.drop_column("quantity_g")
        batch_op.drop_column("brand")
        batch_op.drop_column("product_code")
        batch_op.drop_column("consumed_date")
        batch_op.drop_column("meal_type")
