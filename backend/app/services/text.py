import re

# Arabic code points that Persian keyboards and copy-paste produce interchangeably
# with their Persian counterparts, plus Arabic-Indic and Persian digits.
_FOLD = str.maketrans(
    {
        "ي": "ی",
        "ى": "ی",
        "ئ": "ی",
        "ك": "ک",
        "ة": "ه",
        "ۀ": "ه",
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ؤ": "و",
        "‌": " ",  # ZWNJ: «آسمانی‌نژاد» and «آسمانی نژاد» are the same person
        "‏": "",
        "‎": "",
        **{chr(0x06F0 + i): str(i) for i in range(10)},
        **{chr(0x0660 + i): str(i) for i in range(10)},
    }
)
_DIACRITICS = re.compile(r"[ً-ٰٟ]")
_PUNCT = re.compile(r"[.،,؛;]+")
_SPACES = re.compile(r"\s+")


def fold(text: str) -> str:
    """Search key: letter variants, diacritics, stray dots and spacing folded away."""
    text = _DIACRITICS.sub("", text.translate(_FOLD))
    text = _PUNCT.sub(" ", text)
    return _SPACES.sub(" ", text).strip().lower()


def tidy(text: str) -> str:
    """Display form: Persian letters normalised, spacing collapsed, ZWNJ kept."""
    text = text.replace("ي", "ی").replace("ك", "ک")
    return _SPACES.sub(" ", text).strip()
