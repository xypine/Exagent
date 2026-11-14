from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base for future SQLAlchemy models. No models are defined during bootstrap."""

    pass
