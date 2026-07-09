# app/services/push_notification_service.py
import logging
import httpx
from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.models.push_token import PushToken

logger = logging.getLogger("weaponfitness.push_notification")


async def send_expo_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> bool:
    """
    Send a push notification via Expo's push notification service.
    
    Args:
        push_token: The Expo push token
        title: Notification title
        body: Notification body
        data: Optional data payload
    
    Returns:
        True if successful, False otherwise
    """
    url = "https://exp.host/--/api/v2/push/send"
    
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=message,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
            )
            
            if response.status_code == 200:
                logger.info("Push notification sent successfully")
                return True
            else:
                logger.warning("Failed to send notification (status %s)", response.status_code)
                return False

    except Exception:
        logger.exception("Error sending push notification")
        return False


def send_expo_push_notification_sync(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> bool:
    """
    Synchronous version for use in scheduler.
    """
    import requests
    
    url = "https://exp.host/--/api/v2/push/send"
    
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    
    try:
        response = requests.post(
            url,
            json=message,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )
        
        if response.status_code == 200:
            logger.info("Push notification sent successfully")
            return True
        else:
            logger.warning("Failed to send notification (status %s)", response.status_code)
            return False

    except Exception:
        logger.exception("Error sending push notification")
        return False


def get_trainee_push_token(db: Session, trainee_id: UUID) -> Optional[str]:
    """
    Get the push token for a trainee.
    """
    token_record = db.query(PushToken).filter(
        PushToken.trainee_id == trainee_id,
        PushToken.is_active == True
    ).first()
    
    return token_record.push_token if token_record else None


def save_trainee_push_token(db: Session, trainee_id: UUID, push_token: str) -> PushToken:
    """
    Save or update push token for a trainee.
    """
    existing = db.query(PushToken).filter(
        PushToken.trainee_id == trainee_id
    ).first()
    
    if existing:
        existing.push_token = push_token
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_token = PushToken(
            trainee_id=trainee_id,
            push_token=push_token,
            is_active=True
        )
        db.add(new_token)
        db.commit()
        db.refresh(new_token)
        return new_token


def send_workout_reminder_notification(
    db: Session,
    trainee_id: UUID,
    message: Optional[str] = None
) -> bool:
    """
    Send workout reminder notification to a trainee.
    """
    push_token = get_trainee_push_token(db, trainee_id)
    
    if not push_token:
        logger.warning("No push token found for trainee %s", trainee_id)
        return False
    
    title = " Workout Reminder"
    body = message or "Time for your workout! Get moving!"
    
    return send_expo_push_notification_sync(
        push_token=push_token,
        title=title,
        body=body,
        data={"type": "workout_reminder", "trainee_id": str(trainee_id)}
    )
