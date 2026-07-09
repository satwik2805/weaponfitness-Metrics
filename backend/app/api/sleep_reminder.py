from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import (
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
)
from app.core.database import get_db
from app.db.models.sleep_reminder import SleepReminder
from app.schemas.sleep_reminder import (
    SleepReminderCreate,
    SleepReminderResponse
)

router = APIRouter(prefix="/sleep-reminders", tags=["Sleep Reminders"])


@router.post("/", response_model=SleepReminderResponse)
def create_reminder(
    data: SleepReminderCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # Write: the trainee sets their own reminder, or staff sets it for them.
    assert_self_or_roles(user, data.trainee_id, *STAFF_ROLES)

    # Deactivate any existing active reminders for this trainee to ensure single source of truth
    existing = db.query(SleepReminder).filter(
        SleepReminder.trainee_id == data.trainee_id,
        SleepReminder.is_active == True
    ).all()
    
    for r in existing:
        r.is_active = False
    
    reminder = SleepReminder(**data.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/trainee/{trainee_id}", response_model=list[SleepReminderResponse])
def get_reminders(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # Read: the trainee themselves or staff.
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)

    return db.query(SleepReminder).filter(
        SleepReminder.trainee_id == trainee_id,
        SleepReminder.is_active == True
    ).order_by(SleepReminder.created_at.desc()).all()


@router.put("/{reminder_id}/toggle")
def toggle_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    reminder = db.query(SleepReminder).filter(SleepReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Write: owner or staff.
    assert_self_or_roles(user, reminder.trainee_id, *STAFF_ROLES)

    reminder.is_active = not reminder.is_active
    db.commit()
    return {"status": "updated"}
