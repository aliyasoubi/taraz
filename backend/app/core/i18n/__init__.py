"""User-facing text that the backend produces (Excel exports, import matching, demo data).

The strings live in ``fa.json`` next to this file; source code refers to them by
dotted key. API errors are not translated here: they are sent as English codes
(``patient_not_found``) and the frontend's locale file turns them into text.
"""

import json
from functools import cache
from pathlib import Path
from typing import Any

_PATH = Path(__file__).with_name("fa.json")


@cache
def messages() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(_PATH.read_text(encoding="utf-8"))
    return data


def t(key: str, **params: object) -> Any:
    """``t("export.sheets.summary")``; ``{name}`` placeholders are filled from ``params``."""
    node: Any = messages()
    for part in key.split("."):
        node = node[part]
    if params and isinstance(node, str):
        return node.format(**params)
    return node
