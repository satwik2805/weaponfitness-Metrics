"""Motivation API.

Authorization model (on top of router-wide JWT auth in main.py):
- This router serves randomly generated quotes/greetings only — there is no
  per-resource ownership to assert and no write routes exist.
- Any authenticated user may read. The explicit get_current_user dependency
  below makes that requirement visible at the route level (defence in depth
  alongside the router-wide gate in main.py).
"""

from fastapi import APIRouter, Depends

from app.core.auth import AuthUser, get_current_user
from app.services.motivation_service import get_combined_motivation, get_random_quote, get_random_greeting

router = APIRouter(prefix="/motivation", tags=["Motivation"])

@router.get("/quote")
def get_motivation_quote(user: AuthUser = Depends(get_current_user)):
    return {
        "greeting": get_random_greeting(),
        "quote": get_random_quote(),
        "combined": get_combined_motivation()
    }
