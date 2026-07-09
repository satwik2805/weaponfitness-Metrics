import logging
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.models.trainee import Trainee
import math
from datetime import date

logger = logging.getLogger("weaponfitness.gamification")

XP_PER_WORKOUT = 80
XP_PER_SLEEP_LOG = 20

def get_xp_for_level(level: int) -> int:
    """Total XP required to reach a specific level."""
    if level <= 1:
        return 0
    # Formula: 100*(L-1) + 50*(L-1)*(L-2)/2
    # Level 2: 100
    # Level 3: 250
    # Level 4: 450
    # Level 5: 700
    return 100 * (level - 1) + 50 * (level - 1) * (level - 2) // 2

def calculate_level(xp: int) -> int:
    level = 1
    while get_xp_for_level(level + 1) <= xp:
        level += 1
    return level

def award_xp(db: Session, trainee_id: UUID, amount: int):
    """
    Awards XP to a trainee and returns True if they leveled up.
    """
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        return None

    old_level = trainee.level or calculate_level(trainee.xp or 0)
    trainee.xp = (trainee.xp or 0) + amount
    new_level = calculate_level(trainee.xp)
    
    leveled_up = False
    if new_level > old_level:
        trainee.level = new_level
        leveled_up = True
        logger.info("Trainee %s leveled up to %s!", trainee_id, new_level)

    db.commit()
    db.refresh(trainee)
    
    return {
        "xp_added": amount,
        "total_xp": trainee.xp,
        "level": trainee.level,
        "leveled_up": leveled_up
    }

def get_trainee_gamification_stats(db: Session, trainee_id: UUID, today_date: date = None):
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        return None
        
    current_xp = trainee.xp or 0
    current_level = trainee.level or 1
    
    # Recalculate level just in case
    actual_level = calculate_level(current_xp)
    if actual_level != current_level:
        trainee.level = actual_level
        db.commit()
        current_level = actual_level

    xp_this_level_start = get_xp_for_level(current_level)
    xp_next_level_start = get_xp_for_level(current_level + 1)
    
    xp_in_level = current_xp - xp_this_level_start
    xp_needed_for_level = xp_next_level_start - xp_this_level_start
    
    progress = xp_in_level / xp_needed_for_level if xp_needed_for_level > 0 else 0
    
    from app.services.consistency_service import get_consistency_stats, update_daily_consistency
    # Ensure daily consistency is up-to-date for the requested date
    update_daily_consistency(db, trainee_id, target_date=today_date)
    
    consistency_data = get_consistency_stats(db, trainee_id, current_level, today_date=today_date)

    return {
        "xp": current_xp,
        "level": current_level,
        "xp_in_level": xp_in_level,
        "xp_needed_for_level": xp_needed_for_level,
        "next_level_xp": xp_next_level_start,
        "progress": progress,
        "consistency": consistency_data  # Added consistency stats
    }
