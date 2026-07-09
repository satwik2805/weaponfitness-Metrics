"""Gamification API.

Authorization model (on top of router-wide JWT auth in main.py):
- Reads: a trainee may see their own XP/level stats; staff may see anyone's.
- Writes: NONE are exposed here, and none may be added client-side (audit
  finding WF-040 — farmable XP). XP is awarded exclusively server-side via
  award_xp() in app/services/gamification_service.py, triggered by log
  creation (sleep.py / workout_log.py). If a write route is ever added to
  this router, it MUST be gated to STAFF_ROLES; the trigger logic itself
  belongs server-side (M-next), never as a client-driven XP grant.
"""

import logging
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.auth import (
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
)
from app.core.database import get_db
from app.services.gamification_service import get_trainee_gamification_stats
from app.services.consistency_service import get_consistency_stats

logger = logging.getLogger("weaponfitness.gamification_api")

router = APIRouter()

@router.get("/stats")
def get_stats_param(
    trainee_id: Optional[UUID] = Query(None),
    today_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """
    Endpoint for GET /api/gamification/stats?trainee_id=...&today_date=...
    Includes both XP/Level stats and Consistency/Trifecta stats.
    """
    if not trainee_id:
        return {
            "xp": 0,
            "level": 1,
            "xp_in_level": 0,
            "xp_needed_for_level": 100,
            "next_level_xp": 100,
            "progress": 0,
            "consistency": None
        }

    # Trainee IDs are profile IDs: self may read own stats, staff may read any.
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)

    # 1. Get XP & Level stats
    stats = get_trainee_gamification_stats(db, trainee_id, today_date=today_date)
    if not stats:
         stats = {
            "xp": 0,
            "level": 1,
            "xp_in_level": 0,
            "xp_needed_for_level": 100,
            "next_level_xp": 100,
            "progress": 0
        }
    
    # 2. Get Consistency & Trifecta stats
    try:
        consistency = get_consistency_stats(db, trainee_id, stats.get("level", 1), today_date=today_date)
        stats["consistency"] = consistency
        stats["level_locked"] = not consistency.get("eligible_for_levelup", True)
    except Exception:
        logger.exception("Error fetching consistency stats for trainee %s", trainee_id)
        stats["consistency"] = None
        stats["level_locked"] = False

    return stats
