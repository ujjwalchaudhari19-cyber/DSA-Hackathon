"""Typed domain errors for GramUdyam AI calculators and services."""

from __future__ import annotations


class CalcInputError(ValueError):
    """Raised on invalid or out-of-bounds input across calculators and services."""
    pass

