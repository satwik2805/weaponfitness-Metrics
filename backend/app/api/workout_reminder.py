# app/api/workout_reminder.py
"""Workout reminders are personal data: a member manages their OWN reminders;
staff may act on anyone's. The bare list-all is for the scheduler/staff."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.auth import (
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.workout_reminder import WorkoutReminder
from app.schemas.workout_reminder import (
    WorkoutReminderCreate,
    WorkoutReminderUpdate,
    WorkoutReminderResponse
)

router = APIRouter(tags=["Workout Reminders"])


def _owned_reminder(db: Session, reminder_id: UUID, user: AuthUser) -> WorkoutReminder:
    reminder = db.query(WorkoutReminder).filter(WorkoutReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Workout reminder not found")
    assert_self_or_roles(user, reminder.trainee_id, *STAFF_ROLES)
    return reminder


# GET ALL WORKOUT REMINDERS (staff only)
@router.get("/", response_model=List[WorkoutReminderResponse])
def get_all_reminders(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Get all workout reminders"""
    return db.query(WorkoutReminder).all()


# GET REMINDERS FOR A TRAINEE (self or staff)
@router.get("/trainee/{trainee_id}", response_model=List[WorkoutReminderResponse])
def get_trainee_reminders(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get all workout reminders for a specific trainee"""
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    reminders = db.query(WorkoutReminder).filter(
        WorkoutReminder.trainee_id == trainee_id
    ).all()
    return reminders


# CREATE WORKOUT REMINDER (self or staff)
@router.post("/", response_model=WorkoutReminderResponse)
def create_reminder(
    reminder: WorkoutReminderCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Create a new workout reminder"""
    assert_self_or_roles(user, reminder.trainee_id, *STAFF_ROLES)
    db_reminder = WorkoutReminder(**reminder.model_dump())
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder


# GET SINGLE REMINDER (owner of the reminder, or staff)
@router.get("/{reminder_id}", response_model=WorkoutReminderResponse)
def get_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get a specific workout reminder"""
    return _owned_reminder(db, reminder_id, user)


# UPDATE WORKOUT REMINDER (owner or staff)
@router.put("/{reminder_id}", response_model=WorkoutReminderResponse)
def update_reminder(
    reminder_id: UUID,
    data: WorkoutReminderUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Update a workout reminder"""
    reminder = _owned_reminder(db, reminder_id, user)

    # Update fields
    if data.reminder_time is not None:
        reminder.reminder_time = data.reminder_time
    if data.days_of_week is not None:
        reminder.days_of_week = data.days_of_week
    if data.message is not None:
        reminder.message = data.message
    if data.is_active is not None:
        reminder.is_active = data.is_active

    db.commit()
    db.refresh(reminder)
    return reminder


# DELETE WORKOUT REMINDER (owner or staff)
@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Delete a workout reminder"""
    reminder = _owned_reminder(db, reminder_id, user)
    db.delete(reminder)
    db.commit()
    return {"message": "Workout reminder deleted"}


# TOGGLE REMINDER ACTIVE STATUS (owner or staff)
@router.post("/{reminder_id}/toggle")
def toggle_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Toggle a workout reminder on/off"""
    reminder = _owned_reminder(db, reminder_id, user)

    reminder.is_active = not reminder.is_active
    db.commit()
    db.refresh(reminder)

    status = "activated" if reminder.is_active else "deactivated"
    return {"message": f"Workout reminder {status}", "is_active": reminder.is_active}
