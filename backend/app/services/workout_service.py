import logging
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.models.workout_schedule import WorkoutSchedule
from app.db.models.workout import (
    CustomTraineeWeeklyWorkout,
    GroupWeeklyWorkout,
    TraineeGroupMember
)

logger = logging.getLogger("weaponfitness.workout")


def get_workouts_for_date(db: Session, trainee_id: UUID, check_date: date) -> List[UUID]:
    """
    Returns a list of workout_template_ids scheduled for the given date.
    Checks both explicit WorkoutSchedule and implicit Weekly Templates.
    """
    workout_ids = []
    
    # 1. Check explicit WorkoutSchedule
    schedules = db.query(WorkoutSchedule).filter(
        WorkoutSchedule.trainee_id == trainee_id,
        WorkoutSchedule.scheduled_date == check_date
    ).all()
    
    for s in schedules:
        workout_ids.append(s.workout_template_id)
        
    # If we have explicit schedules, do they OVERRIDE templates?
    # Usually, purely additive is safer unless we have a "Rest" schedule type.
    # We will assume ADDITIVE for now, or that schedules are essentially "migrated templates".
    # But to correctly "shift" what WOULD have happened, we must include templates.
    
    day_name = check_date.strftime("%A").lower()
    
    # 2. Check Custom Weekly Workouts
    customs = db.query(CustomTraineeWeeklyWorkout).filter(
        CustomTraineeWeeklyWorkout.trainee_id == trainee_id,
        CustomTraineeWeeklyWorkout.day_name == day_name
    ).all()
    for c in customs:
        # Avoid duplicates if the same template is somehow scheduled explicitly
        if c.workout_template_id not in workout_ids:
            workout_ids.append(c.workout_template_id)
            
    # 3. Check Group Weekly Workouts
    group_link = db.query(TraineeGroupMember).filter(
        TraineeGroupMember.trainee_id == trainee_id
    ).first()
    
    if group_link:
        groups = db.query(GroupWeeklyWorkout).filter(
            GroupWeeklyWorkout.group_id == group_link.group_id,
            GroupWeeklyWorkout.day_name == day_name
        ).all()
        for g in groups:
            if g.workout_template_id not in workout_ids:
                workout_ids.append(g.workout_template_id)
                
    return workout_ids


def shift_workout_to_tomorrow(
    *,
    db: Session,
    trainee_id: UUID,
    trainer_id: Optional[UUID] = None
):
    """
    Shifts today's workouts to tommorrow.
    If tomorrow already has workouts, they are shifted to the day after, cascading forward.
    Uses WorkoutSchedule to materialize these shifts.
    """
    today = date.today()
    
    # We want to move TODAY's workout to TOMORROW.
    # Start the "wave" with today's workouts.
    moving_workouts = get_workouts_for_date(db, trainee_id, today)
    
    if not moving_workouts:
        logger.info("No workouts to shift for trainee %s on %s", trainee_id, today)
        return

    logger.info("Shifting %d workouts for trainee %s from %s...", len(moving_workouts), trainee_id, today)

    # We process day by day, pushing conflicts forward
    current_date = today + timedelta(days=1)
    # limit loop to avoid infinite recursion specific cases
    max_days = 30 
    
    for _ in range(max_days):
        if not moving_workouts:
            break
            
        logger.debug("  Checking %s...", current_date)
        
        # 1. Identify what is CURRENTLY on this date (before we overwrite/add)
        # These will need to be moved to the NEXT day
        existing_on_date = get_workouts_for_date(db, trainee_id, current_date)
        
        # 2. "Place" the moving workouts onto this date
        # We do this by creating/updating WorkoutSchedule entries.
        # Note: This simply adds them. It doesn't "delete" the template underlying it, 
        # but since we grabbed the template content into `existing_on_date`, we will move that forward too.
        # Effectively, the user will see the "Moved" workouts.
        # Issue: The "Template" for this day is still active. 
        # To truly "Replace", we might need a way to suppress the template. 
        # But `WorkoutSchedule` is additive in this codebase.
        # For now, we assume that if a Schedule exists, the frontend ensures it takes precedence,
        # OR the user accepts they might see both if the UI isn't smart.
        # However, we are essentially building a linked list of displacements.
        
        # To prevent duplicates causing explosion:
        # Check if the workout we are adding is ALREADY scheduled for this date (idempotency)
        # logic: we want to schedule `moving_workouts` on `current_date`
        
        for template_id in moving_workouts:
            # Check if exists to avoid dupe
            exists = db.query(WorkoutSchedule).filter(
                WorkoutSchedule.trainee_id == trainee_id,
                WorkoutSchedule.workout_template_id == template_id,
                WorkoutSchedule.scheduled_date == current_date
            ).first()
            
            if not exists:
                new_schedule = WorkoutSchedule(
                    trainee_id=trainee_id,
                    workout_template_id=template_id,
                    scheduled_date=current_date,
                    # trainer_id could be passed if known, else None
                    trainer_id=trainer_id 
                )
                db.add(new_schedule)
        
        # 3. The "wave" continues: whatever was originally here must move to next day
        moving_workouts = existing_on_date
        current_date += timedelta(days=1)
        
    db.commit()
