# app/services/workout_reminder_scheduler.py
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.db.models.workout_reminder import WorkoutReminder
from app.services.push_notification_service import send_workout_reminder_notification

logger = logging.getLogger("weaponfitness.workout_reminder")


def check_workout_reminders():
    """
    Checks for workout reminders that should be sent now.
    Called by the scheduler every minute.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.time().replace(second=0, microsecond=0)
        current_day = now.strftime("%A")  # e.g., "Monday"
        
        logger.debug("Checking workout reminders for %s on %s...", current_time, current_day)
        
        # Get all active reminders
        reminders = db.query(WorkoutReminder).filter(
            WorkoutReminder.is_active == True
        ).all()
        
        for reminder in reminders:
            # Check if time matches (compare hours and minutes)
            reminder_time = reminder.reminder_time
            if reminder_time.hour != current_time.hour or reminder_time.minute != current_time.minute:
                continue
            
            # Check if day matches (if days_of_week is specified)
            if reminder.days_of_week:
                allowed_days = [day.strip() for day in reminder.days_of_week.split(",")]
                if current_day not in allowed_days:
                    continue
            
            # Time and day match - send reminder
            logger.info("Sending workout reminder to trainee %s", reminder.trainee_id)

            message = reminder.message
            if not message:
                from app.services.motivation_service import get_combined_motivation
                message = get_combined_motivation()

            # Strip emojis to avoid Windows UnicodeEncodeError in log handlers
            clean_message = message.encode('ascii', 'ignore').decode('ascii')
            logger.debug("Reminder message: %s", clean_message)

            # Send push notification
            success = send_workout_reminder_notification(
                db=db,
                trainee_id=reminder.trainee_id,
                message=message
            )

            if success:
                logger.info("Notification sent successfully to trainee %s", reminder.trainee_id)
            else:
                logger.warning("Notification not sent to trainee %s (no push token or error)", reminder.trainee_id)

    except Exception:
        logger.exception("Error in workout reminder scheduler")
    finally:
        db.close()
