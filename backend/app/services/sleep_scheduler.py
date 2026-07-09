import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.db.models.sleep_reminder import SleepReminder

logger = logging.getLogger("weaponfitness.sleep_scheduler")


def check_sleep_reminders():
    db: Session = SessionLocal()
    try:
        now = datetime.now().time().replace(second=0, microsecond=0)
        logger.debug("Checking sleep reminders for %s...", now)  # Heartbeat

        reminders = db.query(SleepReminder).filter(
            SleepReminder.is_active == True
        ).all()

        for r in reminders:
            if r.bedtime == now:
                logger.info("Bedtime reminder for trainee %s", r.trainee_id)

                # later: push notification / websocket / email
    finally:
        db.close()
