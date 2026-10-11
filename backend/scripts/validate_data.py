"""Run: python scripts/validate_data.py  (exit code 1 if any problem)"""
import json
import sys
import pathlib
import datetime

DATA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "app/data")
errors = []

def load(name):
    try:
        p = DATA / name
        if not p.exists():
            return []
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"{name}: cannot load ({e})")
        return None

def find_nulls(obj, path=""):
    if obj is None:
        yield path
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from find_nulls(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from find_nulls(v, f"{path}[{i}]")

businesses = load("businesses.json") or []
for b in businesses:
    bid = b.get("id", "?")
    for p in find_nulls(b):
        errors.append(f"businesses.json: null placeholder at {bid}{p}")
    if len(b.get("seasonality", [])) != 12:
        errors.append(f"{bid}: seasonality must have 12 values")
    if not b.get("cost_template"):
        errors.append(f"{bid}: empty cost_template")

for s in load("schemes.json") or []:
    sid = s.get("id", "?")
    for k in ("source_url", "last_verified", "eligibility", "how_to_apply"):
        if not s.get(k):
            errors.append(f"schemes.json: {sid} missing {k}")
    try:
        age = (datetime.date.today() - datetime.date.fromisoformat(s["last_verified"])).days
        if age > 90:
            errors.append(f"schemes.json: {sid} last_verified is {age} days old")
    except Exception:
        errors.append(f"schemes.json: {sid} bad last_verified date")

ids = {b.get("id") for b in businesses}
for lm in load("local_market.json") or []:
    if lm.get("business_id") not in ids:
        errors.append(f"local_market.json: unknown business_id {lm.get('business_id')}")
    if lm.get("confidence") not in ("high", "medium", "approximate"):
        errors.append(f"local_market.json: bad confidence for {lm.get('district')}")

print("OK" if not errors else "\n".join(errors))
sys.exit(1 if errors else 0)

