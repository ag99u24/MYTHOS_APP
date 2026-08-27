"""add plan item tracking fields

Revision ID: b58b7f1c6d24
Revises: 4e8ec2509749
Create Date: 2026-08-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b58b7f1c6d24"
down_revision = "4e8ec2509749"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("workout_entries") as batch_op:
        batch_op.add_column(sa.Column("plan_item_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("sets_completed", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("reps_completed", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_workout_entries_plan_item_id_plan_items", "plan_items", ["plan_item_id"], ["id"])

    with op.batch_alter_table("diet_entries") as batch_op:
        batch_op.add_column(sa.Column("plan_item_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("consumed_food", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("recommended_meal", sa.String(length=160), nullable=True))
        batch_op.create_foreign_key("fk_diet_entries_plan_item_id_plan_items", "plan_items", ["plan_item_id"], ["id"])


def downgrade():
    with op.batch_alter_table("diet_entries") as batch_op:
        batch_op.drop_constraint("fk_diet_entries_plan_item_id_plan_items", type_="foreignkey")
        batch_op.drop_column("recommended_meal")
        batch_op.drop_column("consumed_food")
        batch_op.drop_column("plan_item_id")

    with op.batch_alter_table("workout_entries") as batch_op:
        batch_op.drop_constraint("fk_workout_entries_plan_item_id_plan_items", type_="foreignkey")
        batch_op.drop_column("reps_completed")
        batch_op.drop_column("sets_completed")
        batch_op.drop_column("plan_item_id")
