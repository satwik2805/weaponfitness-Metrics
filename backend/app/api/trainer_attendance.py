"""Trainer attendance. A trainer marks/reads their OWN attendance;
Owner/Admin/Receptionist manage anyone's. Absence-handling (which mutates
group schedules) is staff-only."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.core.auth import (
    ADMIN_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.trainer_attendance import TrainerAttendance
from app.schemas.trainer_attendance import (
    TrainerAttendanceCreate,
    TrainerAttendanceUpdate,
    TrainerAttendanceResponse
)
from app.services.trainer_absence_service import handle_trainer_absence

router = APIRouter(tags=["Trainer Attendance"])

DESK_ROLES = ("Owner", "Admin", "Receptionist")


@router.get("/")
def get_all_trainer_attendance(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*DESK_ROLES)),
):
    return db.query(TrainerAttendance).all()


@router.post("/", response_model=TrainerAttendanceResponse)
def create_trainer_attendance(
    attendance: TrainerAttendanceCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # a trainer logs their own day; the desk logs anyone's
    assert_self_or_roles(user, attendance.trainer_id, *DESK_ROLES)

    existing = db.query(TrainerAttendance).filter(
        TrainerAttendance.trainer_id == attendance.trainer_id,
        TrainerAttendance.attendance_date == attendance.attendance_date
    ).first()

    if existing:
        existing.is_present = attendance.is_present
        db.commit()
        db.refresh(existing)
        return existing

    db_attendance = TrainerAttendance(**attendance.model_dump())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.get("/{attendance_id}", response_model=TrainerAttendanceResponse)
def get_trainer_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    attendance = db.query(TrainerAttendance).filter(TrainerAttendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Trainer Attendance not found")
    assert_self_or_roles(user, attendance.trainer_id, *DESK_ROLES)
    return attendance


@router.put("/{attendance_id}", response_model=TrainerAttendanceResponse)
def update_trainer_attendance(
    attendance_id: UUID,
    data: TrainerAttendanceUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*DESK_ROLES)),
):
    attendance = db.query(TrainerAttendance).filter(TrainerAttendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Trainer Attendance not found")

    attendance.is_present = data.is_present
    db.commit()
    db.refresh(attendance)
    return attendance


@router.delete("/{attendance_id}")
def delete_trainer_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    attendance = db.query(TrainerAttendance).filter(TrainerAttendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Trainer Attendance not found")

    db.delete(attendance)
    db.commit()
    return {"message": "Trainer Attendance deleted"}


@router.post("/absent/{trainer_id}")
def mark_trainer_absent(
    trainer_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*DESK_ROLES)),
):
    try:
        handle_trainer_absence(db=db, trainer_id=trainer_id)
        return {"message": "Trainer marked absent, group workouts shifted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Couldn't process the absence — check the trainer's group schedule.")
