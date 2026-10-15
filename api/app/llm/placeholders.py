import re

_TOKEN = re.compile(r"\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}")
_DIGITS = re.compile(r"[0-9\u0966-\u096F]{3,}")        # 3+ ASCII or Devanagari digits

ALLOWED_TOKENS = {
    "gap", "emi", "total_investment", "capital", "break_even_months",
    "loan_amount", "monthly_profit", "interest_rate"
}

class NarrativeRejected(ValueError):
    pass

def check_text(text: str, allowed=ALLOWED_TOKENS):
    """Raise NarrativeRejected if text has unknown tokens or loose numbers outside placeholders."""
    for name in _TOKEN.findall(text):
        if name not in allowed:
            raise NarrativeRejected(f"unknown token {{{{{name}}}}}")
    stripped = _TOKEN.sub("", text)
    if _DIGITS.search(stripped):
        raise NarrativeRejected("loose number in narrative; use placeholders")

def fill(text: str, values: dict) -> str:
    def repl(m):
        key = m.group(1)
        if key not in values:
            raise NarrativeRejected(f"no value for token {key}")
        return str(values[key])
    return _TOKEN.sub(repl, text)

def inr(n: float) -> str:
    """Indian digit grouping: 235000 -> '₹2,35,000'."""
    n = int(round(n))
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return ("-" if n < 0 else "") + "₹" + s

