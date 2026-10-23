from collections.abc import Iterable
from typing import Any


def apply_patch(target: object, changes: dict[str, Any], required: Iterable[str] = ()) -> None:
    """Copy a PATCH body onto an ORM object.

    ``changes`` holds only the fields the client sent. A ``None`` for a field in
    ``required`` means "leave it", since those columns cannot be cleared.
    """
    keep = set(required)
    for key, value in changes.items():
        if value is None and key in keep:
            continue
        setattr(target, key, value)
