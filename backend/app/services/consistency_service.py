import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.models.consistency_progress import ConsistencyProgress, WeeklyConsistency
from app.db.models.attendance import Attendance
from app.db.models.workout_log import WorkoutLog
from app.db.models.sleep import SleepLog
from app.db.models.daily_nutrition import DailyNutrition
from app.db.models.trainee import Trainee
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from sqlalchemy import func, cast, Date

logger = logging.getLogger("weaponfitness.consistency")

def get_monday(d: date):
    """Returns the Monday of the week for a given date."""
    return d - timedelta(days=d.weekday())

def update_daily_consistency(db: Session, trainee_id: UUID, target_date: date = None):
    """
    Checks and updates the consistency trifecta for a specific date.
    Trifecta = Attendance + Completed Workout + Sleep Logged.
    """
    if target_date is None:
        target_date = date.today()

    # 1. Check Attendance
    has_attendance = db.query(Attendance).filter(
        Attendance.trainee_id == trainee_id,
        Attendance.attendance_date == target_date,
        Attendance.is_present == True
    ).first() is not None

    # 2. Check Workout
    has_workout = db.query(WorkoutLog).filter(
        WorkoutLog.trainee_id == trainee_id,
        WorkoutLog.workout_date == target_date,
        WorkoutLog.is_completed == True
    ).first() is not None

    has_sleep = db.query(SleepLog).filter(
        SleepLog.trainee_id == trainee_id,
        SleepLog.sleep_date == target_date
    ).first() is not None

    # 4. Check Diet
    has_diet = db.query(DailyNutrition).filter(
        DailyNutrition.trainee_id == trainee_id,
        DailyNutrition.date == target_date
    ).first() is not None

    # 4. Update ConsistencyProgress
    progress = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date == target_date
    ).first()

    if not progress:
        progress = ConsistencyProgress(
            trainee_id=trainee_id,
            date=target_date
        )
        db.add(progress)

    old_trifecta = progress.trifecta_met
    
    progress.attendance_met = has_attendance
    progress.workout_met = has_workout
    progress.sleep_met = has_sleep
    progress.diet_met = has_diet
    
    # Trifecta is met if ALL FOUR are true
    progress.trifecta_met = has_attendance and has_workout and has_sleep and has_diet

    db.commit()
    db.refresh(progress)

    # 5. Award XP if Trifecta was newly met today
    if not old_trifecta and progress.trifecta_met:
        from app.services.gamification_service import award_xp
        award_xp(db, trainee_id, 100)
        logger.info("Trainee %s completed Trifecta on %s (+100 XP)", trainee_id, target_date)

    # 6. Update Weekly Consistency if trifecta status changed
    if old_trifecta != progress.trifecta_met:
        update_weekly_milestone(db, trainee_id, target_date)

    return progress

def update_weekly_milestone(db: Session, trainee_id: UUID, target_date: date):
    """
    Recalculates the weekly trifecta count for the week containing target_date.
    """
    monday = get_monday(target_date)
    sunday = monday + timedelta(days=6)

    # Count trifecta days in this week
    trifecta_count = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date >= monday,
        ConsistencyProgress.date <= sunday,
        ConsistencyProgress.trifecta_met == True
    ).count()

    weekly = db.query(WeeklyConsistency).filter(
        WeeklyConsistency.trainee_id == trainee_id,
        WeeklyConsistency.week_start_date == monday
    ).first()

    if not weekly:
        weekly = WeeklyConsistency(
            trainee_id=trainee_id,
            week_start_date=monday
        )
        db.add(weekly)

    weekly.trifecta_days_count = trifecta_count
    # Milestone reached if at least 5 days met the trifecta
    weekly.milestone_achieved = trifecta_count >= 5
    
    db.commit()
    return weekly

def is_trainee_eligible_for_levelup(db: Session, trainee_id: UUID, current_level: int):
    """
    A trainee is ONLY eligible to move to the next level if their current level
    is less than (1 + total_milestones_achieved). 
    This enforces a hard '1 Level per Milestone' rule.
    """
    milestone_count = db.query(WeeklyConsistency).filter(
        WeeklyConsistency.trainee_id == trainee_id,
        WeeklyConsistency.milestone_achieved == True
    ).count()

    allowed_level = 1 + milestone_count
    return current_level < allowed_level

def get_consistency_stats(db: Session, trainee_id: UUID, current_level: int, today_date: date = None):
    """
    Returns data for frontend visual indicators.
    """
    if today_date is None:
        today_date = date.today()
        
    monday = get_monday(today_date)
    sunday = monday + timedelta(days=6)
    
    # Daily progress for requested date
    daily = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date == today_date
    ).first()
    
    # Weekly progress
    weekly = db.query(WeeklyConsistency).filter(
        WeeklyConsistency.trainee_id == trainee_id,
        WeeklyConsistency.week_start_date == monday
    ).first()

    # Get status for each day of the current week (for dots in UI)
    days_data = []
    for i in range(7):
        day = monday + timedelta(days=i)
        p = db.query(ConsistencyProgress).filter(
            ConsistencyProgress.trainee_id == trainee_id,
            ConsistencyProgress.date == day
        ).first()
        days_data.append({
            "day": day.strftime("%a"),
            "is_met": p.trifecta_met if p else False
        })

    # Get counts for individual components this week
    attendance_count = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date >= monday,
        ConsistencyProgress.date <= sunday,
        ConsistencyProgress.attendance_met == True
    ).count()

    workout_count = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date >= monday,
        ConsistencyProgress.date <= sunday,
        ConsistencyProgress.workout_met == True
    ).count()

    sleep_count = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date >= monday,
        ConsistencyProgress.date <= sunday,
        ConsistencyProgress.sleep_met == True
    ).count()

    diet_count = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date >= monday,
        ConsistencyProgress.date <= sunday,
        ConsistencyProgress.diet_met == True
    ).count()

    # --- ADVANCED METRICS CALCULATION ---
    
    # 1. Sleep Efficiency (Hours / 8.0)
    sleep_logs = db.query(SleepLog).filter(
        SleepLog.trainee_id == trainee_id,
        SleepLog.sleep_date >= monday,
        SleepLog.sleep_date <= sunday
    ).all()
    
    total_sleep_score = 0.0
    # Map logs by date to handle multiple entries if any (though usually 1 per day)
    sleep_by_date = {}
    for log in sleep_logs:
        d = log.sleep_date
        if d not in sleep_by_date:
            sleep_by_date[d] = 0.0
        sleep_by_date[d] += (log.total_hours or 0.0)
        
    for d, hours in sleep_by_date.items():
        # Target: 8 hours. Cap at 100%
        daily_efficiency = min(hours / 8.0, 1.0)
        total_sleep_score += daily_efficiency
        
    sleep_weekly_avg = min(total_sleep_score / 5.0, 1.0)

    # 2. Diet Intake (Calories / Goal)
    # Get goal
    goal = db.query(NutrientGoal).filter(NutrientGoal.trainee_id == trainee_id).first()
    daily_cal_goal = (goal.daily_calories if (goal and goal.daily_calories is not None and goal.daily_calories > 0) else 2000.0)
    
    # Get total calories per day
    daily_nutrition = db.query(
        cast(NutritionLog.log_date, Date).label('date'),
        func.sum(NutritionLog.calories).label('total_calories')
    ).filter(
        NutritionLog.trainee_id == trainee_id,
        cast(NutritionLog.log_date, Date) >= monday,
        cast(NutritionLog.log_date, Date) <= sunday
    ).group_by(cast(NutritionLog.log_date, Date)).all()

    total_diet_score = 0.0
    for day_stat in daily_nutrition:
        cals = day_stat.total_calories or 0.0
        # Target: Goal calories. Cap at 100%
        daily_intake = min(cals / daily_cal_goal, 1.0)
        total_diet_score += daily_intake
        
    diet_weekly_avg = min(total_diet_score / 5.0, 1.0)

    # Legacy fallback: If advanced metrics are 0 but boolean flags are set (migration transition), use legacy count
    if sleep_weekly_avg == 0 and sleep_count > 0:
        sleep_weekly_avg = min(sleep_count / 5.0, 1.0)
    
    if diet_weekly_avg == 0 and diet_count > 0:
         diet_weekly_avg = min(diet_count / 5.0, 1.0)


    # Calculate streak (consecutive days with attendance or workout)
    # Get all consistency records for the trainee, ordered by date descending
    all_streak_records = db.query(ConsistencyProgress).filter(
        ConsistencyProgress.trainee_id == trainee_id,
        ConsistencyProgress.date <= today_date
    ).order_by(ConsistencyProgress.date.desc()).limit(365).all()

    current_streak = 0
    # Check if today is completed (attendance OR workout)
    today_completed = False
    if all_streak_records and all_streak_records[0].date == today_date:
        if all_streak_records[0].attendance_met or all_streak_records[0].workout_met:
            current_streak += 1
            today_completed = True
    
    # Check previous days
    check_date = today_date - timedelta(days=1)
    # Start iterating from index 1 if today is in records, else 0
    start_idx = 1 if (all_streak_records and all_streak_records[0].date == today_date) else 0

    for i in range(start_idx, len(all_streak_records)):
        record = all_streak_records[i]
        # If there's a gap in dates, streak is broken
        if record.date != check_date:
            break
            
        if record.attendance_met or record.workout_met:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return {
        "daily": {
            "attendance": bool(daily.attendance_met) if daily else False,
            "workout": bool(daily.workout_met) if daily else False,
            "sleep": bool(daily.sleep_met) if daily else False,
            "diet": bool(daily.diet_met) if daily else False,
            "trifecta": bool(daily.trifecta_met) if daily else False,
            "attendance_weekly_avg": min(attendance_count / 5.0, 1.0),
            "workout_weekly_avg": min(workout_count / 5.0, 1.0),
            "sleep_weekly_avg": sleep_weekly_avg,
            "diet_weekly_avg": diet_weekly_avg
        },
        "weekly": {
            "count": weekly.trifecta_days_count if weekly else 0,
            "milestone_met": weekly.milestone_achieved if weekly else False,
            "days": days_data,
            "streak": current_streak
        },
        "eligible_for_levelup": is_trainee_eligible_for_levelup(db, trainee_id, current_level)
    }
