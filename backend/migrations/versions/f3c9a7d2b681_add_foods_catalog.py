"""add foods catalog

Revision ID: f3c9a7d2b681
Revises: e7a91d3c4b12
Create Date: 2026-09-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f3c9a7d2b681"
down_revision = "e7a91d3c4b12"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "foods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("presentation", sa.String(length=100), nullable=True),
        sa.Column("base_g", sa.Float(), nullable=False),
        sa.Column("calories_kcal_100g", sa.Float(), nullable=True),
        sa.Column("protein_g_100g", sa.Float(), nullable=True),
        sa.Column("carbs_g_100g", sa.Float(), nullable=True),
        sa.Column("fat_g_100g", sa.Float(), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_foods_category"), "foods", ["category"], unique=False)
    op.create_index(op.f("ix_foods_code"), "foods", ["code"], unique=False)
    op.create_index(op.f("ix_foods_name"), "foods", ["name"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_foods_name"), table_name="foods")
    op.drop_index(op.f("ix_foods_code"), table_name="foods")
    op.drop_index(op.f("ix_foods_category"), table_name="foods")
    op.drop_table("foods")
