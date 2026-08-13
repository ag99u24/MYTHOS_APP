"""initial schema

Revision ID: 9ce6b4b7b4f5
Revises: 
Create Date: 2026-07-11 09:57:23.253972

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9ce6b4b7b4f5'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('expires_at', sa.DateTime(), nullable=True))

    op.execute("UPDATE password_reset_tokens SET expires_at = CURRENT_TIMESTAMP WHERE expires_at IS NULL")

    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.alter_column('expires_at', nullable=False)


def downgrade():
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.drop_column('expires_at')
