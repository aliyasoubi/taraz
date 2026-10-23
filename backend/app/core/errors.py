"""Domain errors.

Services raise these instead of HTTP exceptions, so the business layer does not
depend on the web framework; ``app/api/errors.py`` maps them to status codes.
Each carries a stable English ``code`` that the frontend translates.
"""


class DomainError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class NotFoundError(DomainError):
    """The referenced record does not exist."""


class ConflictError(DomainError):
    """The operation is not allowed in the record's current state."""


class InvalidError(DomainError):
    """The input is well-formed but breaks a business rule."""
