"""Attendance API.

Authorization (profile.py exemplar): staff manage attendance; a member can
read their own rows and check themselves in ONLY through the rotating signed
QR (never by posting arbitrary dates).
"""

from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.checkin import mint_token, verify_token
from app.core.config import settings
from app.core.database import get_db
from app.db.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.services.attendance_service import handle_absence
from app.services.workout_tracking_service import auto_create_workout_log_from_attendance

router = APIRouter(tags=["Attendance"])


def _post_checkin_side_effects(db: Session, db_attendance: Attendance) -> None:
    """Workout-log + consistency hooks shared by staff creation and QR check-in."""
    if db_attendance.trainee_id and db_attendance.is_present:
        try:
            auto_create_workout_log_from_attendance(
                db=db,
                attendance_id=db_attendance.id,
                trainee_id=db_attendance.trainee_id,
                attendance_date=db_attendance.attendance_date,
            )
        except Exception:
            pass  # the check-in itself must not fail on tracking hooks
    if db_attendance.trainee_id:
        try:
            from app.services.consistency_service import update_daily_consistency

            update_daily_consistency(db, db_attendance.trainee_id, db_attendance.attendance_date)
        except Exception:
            pass


# --------------------------------------------------
# ROTATING SIGNED QR (audit WF-010)
# --------------------------------------------------
class CheckinPayload(BaseModel):
    token: str


@router.get("/qr-token")
def qr_token(user: AuthUser = Depends(require_roles(*STAFF_ROLES))):
    """Front-desk display token — branch comes from the CALLER's profile."""
    if not settings.CHECKIN_SECRET:
        raise HTTPException(status_code=503, detail="Check-in isn't configured yet (CHECKIN_SECRET missing).")
    branch_id = getattr(user.profile, "branch_id", None)
    if not branch_id:
        raise HTTPException(status_code=400, detail="Your staff profile isn't assigned to a branch.")
    token, expires_in = mint_token(settings.CHECKIN_SECRET, str(branch_id))
    return {"token": token, "expires_in_seconds": expires_in, "branch_id": str(branch_id)}


@router.post("/checkin")
def qr_checkin(
    payload: CheckinPayload,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Member self check-in: identity from the JWT, date is always today,
    validity proven by the signed rotating token."""
    if user.role != "Trainee":
        raise HTTPException(status_code=403, detail="Only members check in with the QR code.")
    if not settings.CHECKIN_SECRET:
        raise HTTPException(status_code=503, detail="Check-in isn't configured yet.")

    try:
        verify_token(settings.CHECKIN_SECRET, payload.token)
    except ValueError:
        raise HTTPException(status_code=400, detail="That code has expired — scan the screen again.")

    today = date_type.today()
    existing = (
        db.query(Attendance)
        .filter(Attendance.trainee_id == user.id, Attendance.attendance_date == today)
        .first()
    )
    if existing:
        return {"status": "already_checked_in", "attendance_id": str(existing.id)}

    db_attendance = Attendance(trainee_id=user.id, attendance_date=today, is_present=True)
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    _post_checkin_side_effects(db, db_attendance)
    return {"status": "checked_in", "attendance_id": str(db_attendance.id)}


# --------------------------------------------------
# STAFF-MANAGED ATTENDANCE
# --------------------------------------------------
@router.get("/")
def get_all_attendance(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    return db.query(Attendance).all()


@router.post("/", response_model=AttendanceResponse)
def create_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    existing = db.query(Attendance).filter(
        Attendance.trainee_id == attendance.trainee_id,
        Attendance.attendance_date == attendance.attendance_date
    ).first()

    if existing:
        return existing

    db_attendance = Attendance(**attendance.model_dump())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    _post_checkin_side_effects(db, db_attendance)
    return db_attendance


@router.get("/trainee/{trainee_id}")
def get_trainee_attendance(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # a member may read their own history; staff may read anyone's
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    return (
        db.query(Attendance)
        .filter(Attendance.trainee_id == trainee_id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")
    assert_self_or_roles(user, attendance.trainee_id, *STAFF_ROLES)
    return attendance


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: UUID,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    attendance.is_present = data.is_present
    db.commit()
    db.refresh(attendance)
    return attendance


@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    db.delete(attendance)
    db.commit()
    return {"message": "Attendance deleted"}


@router.post("/absent/{trainee_id}")
def mark_absent(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    try:
        handle_absence(db=db, trainee_id=trainee_id)
        return {"message": "Absent marked, workout shifted to tomorrow"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
