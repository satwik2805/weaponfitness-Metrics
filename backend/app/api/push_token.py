# app/api/push_token.py
#
# Authorization (on top of router-wide JWT auth in main.py):
# - Push tokens belong to the device's signed-in user. The {trainee_id} in the
#   path must equal the caller's own id; staff roles may act for any trainee.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

from app.core.auth import (
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
)
from app.core.database import get_db
from app.db.models.push_token import PushToken
from app.services.push_notification_service import (
    save_trainee_push_token,
    send_expo_push_notification_sync
)

router = APIRouter(tags=["Push Notifications"])


class PushTokenCreate(BaseModel):
    push_token: str


class PushTokenResponse(BaseModel):
    id: UUID
    trainee_id: UUID
    push_token: str
    is_active: bool

    class Config:
        from_attributes = True


class TestNotificationRequest(BaseModel):
    title: str = "Test Notification"
    body: str = "This is a test notification from WeaponFitness!"


# SAVE PUSH TOKEN
@router.post("/trainee/{trainee_id}/push-token", response_model=PushTokenResponse)
def save_push_token(
    trainee_id: UUID,
    data: PushTokenCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Save or update push token for a trainee"""
    # Only the token owner may register a device (staff may act for a trainee).
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    token = save_trainee_push_token(db, trainee_id, data.push_token)
    return token


# GET PUSH TOKEN
@router.get("/trainee/{trainee_id}/push-token")
def get_push_token(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get push token for a trainee"""
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    token = db.query(PushToken).filter(
        PushToken.trainee_id == trainee_id,
        PushToken.is_active == True
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Push token not found")
    
    return token


# DELETE PUSH TOKEN
@router.delete("/trainee/{trainee_id}/push-token")
def delete_push_token(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Delete push token for a trainee (disable notifications)"""
    # Only the token owner may unregister (staff may act for a trainee).
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    token = db.query(PushToken).filter(
        PushToken.trainee_id == trainee_id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Push token not found")
    
    token.is_active = False
    db.commit()
    
    return {"message": "Push token disabled"}


# TEST NOTIFICATION (for development)
@router.post("/trainee/{trainee_id}/test-notification")
def send_test_notification(
    trainee_id: UUID,
    data: Optional[TestNotificationRequest] = None,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Send a test notification to a trainee"""
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    token = db.query(PushToken).filter(
        PushToken.trainee_id == trainee_id,
        PushToken.is_active == True
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Push token not found for this trainee")
    
    title = data.title if data else "Test Notification"
    body = data.body if data else "This is a test notification from WeaponFitness!"
    
    success = send_expo_push_notification_sync(
        push_token=token.push_token,
        title=title,
        body=body,
        data={"type": "test", "trainee_id": str(trainee_id)}
    )
    
    if success:
        return {"message": "Test notification sent successfully!"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send notification")
