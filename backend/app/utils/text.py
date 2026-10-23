import re

# Arabic code points that Persian keyboards and copy-paste produce interchangeably
# with their Persian counterparts, plus Arabic-Indic and Persian digits.
_FOLD = str.maketrans(
    {
        "\u064a": "\u06cc",  # Arabic yeh -> Persian yeh
        "\u0649": "\u06cc",
        "\u0626": "\u06cc",
        "\u0643": "\u06a9",  # Arabic kaf -> Persian keheh
        "\u0629": "\u0647",
        "\u06c0": "\u0647",
        "\u0623": "\u0627",
        "\u0625": "\u0627",
        "\u0622": "\u0627",
        "\u0624": "\u0648",
        "\u200c": " ",  # ZWNJ: a half-space and a space spell the same name
        "\u200f": "",  # right-to-left mark
        "\u200e": "",  # left-to-right mark
        **{chr(0x06F0 + i): str(i) for i in range(10)},
        **{chr(0x0660 + i): str(i) for i in range(10)},
    }
)
_DIACRITICS = re.compile(r"[\u064B-\u065F\u0670]")
_PUNCT = re.compile(r"[.\u060C,\u061B;]+")
_SPACES = re.compile(r"\s+")


def fold(text: str) -> str:
    """Search key: letter variants, diacritics, stray dots and spacing folded away."""
    text = _DIACRITICS.sub("", text.translate(_FOLD))
    text = _PUNCT.sub(" ", text)
    return _SPACES.sub(" ", text).strip().lower()


def tidy(text: str) -> str:
    """Display form: Persian letters normalised, spacing collapsed, ZWNJ kept."""
    text = text.replace("\u064a", "\u06cc").replace("\u0643", "\u06a9")
    return _SPACES.sub(" ", text).strip()
