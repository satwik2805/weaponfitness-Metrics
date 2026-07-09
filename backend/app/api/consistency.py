"""Consistency API.

Authorization model (on top of router-wide JWT auth in main.py):
- Reads: a trainee may see their own consistency/trifecta stats; staff may
  see anyone's (trainee IDs are profile IDs).
- The update_daily_consistency() call below is a server-side recompute from
  the trainee's existing logs — not client-supplied data — so it is safe to
  run for the caller's own record (or under a staff read).
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import (
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
)
from app.core.database import get_db
from app.services.consistency_service import get_consistency_stats, update_daily_consistency
from app.db.models.trainee import Trainee

router = APIRouter()

@router.get("/stats/{trainee_id}")
def get_trifecta_stats(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    today_date: date = Query(None),
    user: AuthUser = Depends(get_current_user),
):
    """
    Returns the daily trifecta status, weekly consistency, and check for level-up eligibility.
    """
    # Self may read own stats; staff may read any trainee's.
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    # Ensure daily consistency is up to date (re-check logs)
    update_daily_consistency(db, trainee_id, target_date=today_date)

    current_level = trainee.level if trainee.level else 1
    stats = get_consistency_stats(db, trainee_id, current_level=current_level, today_date=today_date)
    return stats
