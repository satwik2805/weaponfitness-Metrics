"""Group classes & bookings.

Authorization model (per the profile.py exemplar):
- Browsing the schedule: any signed-in user.
- Creating/editing classes: Owner/Admin anywhere; a Trainer only as themselves.
- Booking: Trainees book for THEMSELVES (identity from the JWT, never the body).
- Cancelling: the member who booked, or staff.
Business rules enforced server-side: date must match the class weekday,
no past-date bookings, capacity respected, no double booking.
"""

from datetime import date as date_type, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.gym_class import BookingStatusEnum, ClassBooking, GymClass
from app.db.models.trainee import Trainee
from app.schemas.gym_class import (
    BookingCreate,
    BookingResponse,
    ClassWithAvailability,
    GymClassCreate,
    GymClassResponse,
    GymClassUpdate,
)

router = APIRouter()


def _live_bookings(db: Session, class_id, class_date):
    return (
        db.query(func.count(ClassBooking.id))
        .filter(
            ClassBooking.class_id == class_id,
            ClassBooking.class_date == class_date,
            ClassBooking.status != BookingStatusEnum.Cancelled,
        )
        .scalar()
        or 0
    )


def _next_date_for_weekday(weekday: int) -> date_type:
    today = date_type.today()
    return today + timedelta(days=(weekday - today.weekday()) % 7)


# --------------------------------------------------
# CREATE / UPDATE / DELETE (staff)
# --------------------------------------------------
@router.post("/", response_model=GymClassResponse)
def create_class(
    payload: GymClassCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles("Owner", "Admin", "Trainer")),
):
    data = payload.model_dump()
    # A trainer can only schedule classes they themselves teach.
    if user.role == "Trainer":
        data["trainer_id"] = user.id

    gym_class = GymClass(**data)
    db.add(gym_class)
    db.commit()
    db.refresh(gym_class)
    return gym_class


@router.put("/{class_id}", response_model=GymClassResponse)
def update_class(
    class_id: UUID,
    payload: GymClassUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles("Owner", "Admin", "Trainer")),
):
    gym_class = db.query(GymClass).filter(GymClass.id == class_id).first()
    if not gym_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if user.role == "Trainer" and str(gym_class.trainer_id) != str(user.id):
        raise HTTPException(status_code=403, detail="You can only edit your own classes.")

    updates = payload.model_dump(exclude_unset=True)
    if user.role == "Trainer":
        updates.pop("trainer_id", None)  # a trainer can't reassign the class
    for key, value in updates.items():
        setattr(gym_class, key, value)
    db.commit()
    db.refresh(gym_class)
    return gym_class


@router.delete("/{class_id}")
def delete_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles("Owner", "Admin", "Trainer")),
):
    gym_class = db.query(GymClass).filter(GymClass.id == class_id).first()
    if not gym_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if user.role == "Trainer" and str(gym_class.trainer_id) != str(user.id):
        raise HTTPException(status_code=403, detail="You can only remove your own classes.")
    db.delete(gym_class)
    db.commit()
    return {"message": "Class removed"}


# --------------------------------------------------
# BROWSE (any signed-in user)
# --------------------------------------------------
@router.get("/", response_model=list[ClassWithAvailability])
def list_classes(
    branch_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    q = db.query(GymClass)
    if branch_id:
        q = q.filter(GymClass.branch_id == branch_id)
    classes = q.order_by(GymClass.weekday, GymClass.start_time).all()

    out = []
    for c in classes:
        next_date = _next_date_for_weekday(c.weekday)
        booked = _live_bookings(db, c.id, next_date)
        base = GymClassResponse.model_validate(c, from_attributes=True)
        out.append(
            ClassWithAvailability(
                **base.model_dump(),
                booked=booked,
                spots_left=max(0, c.capacity - booked),
            )
        )
    return out


# --------------------------------------------------
# BOOK (trainee, self only)
# --------------------------------------------------
@router.post("/{class_id}/book", response_model=BookingResponse)
def book_class(
    class_id: UUID,
    payload: BookingCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    if user.role != "Trainee":
        raise HTTPException(status_code=403, detail="Only members can book classes.")

    trainee = db.query(Trainee).filter(Trainee.id == user.id).first()
    if not trainee:
        raise HTTPException(status_code=400, detail="Your member record isn't set up yet — ask the front desk.")

    gym_class = db.query(GymClass).filter(GymClass.id == class_id).first()
    if not gym_class:
        raise HTTPException(status_code=404, detail="Class not found")

    when = payload.class_date
    if when < date_type.today():
        raise HTTPException(status_code=400, detail="That date has already passed.")
    if when.weekday() != gym_class.weekday:
        raise HTTPException(status_code=400, detail="This class doesn't run on that day.")

    existing = (
        db.query(ClassBooking)
        .filter(
            ClassBooking.class_id == class_id,
            ClassBooking.trainee_id == user.id,
            ClassBooking.class_date == when,
        )
        .first()
    )
    if existing and existing.status != BookingStatusEnum.Cancelled:
        raise HTTPException(status_code=400, detail="You're already booked for this class.")

    if _live_bookings(db, class_id, when) >= gym_class.capacity:
        raise HTTPException(status_code=409, detail="This class is full for that day.")

    if existing:  # re-book a cancelled slot
        existing.status = BookingStatusEnum.Booked
        db.commit()
        db.refresh(existing)
        return existing

    booking = ClassBooking(class_id=class_id, trainee_id=user.id, class_date=when)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


# --------------------------------------------------
# MY BOOKINGS / CANCEL
# --------------------------------------------------
@router.get("/bookings/mine", response_model=list[BookingResponse])
def my_bookings(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return (
        db.query(ClassBooking)
        .filter(
            ClassBooking.trainee_id == user.id,
            ClassBooking.class_date >= date_type.today(),
            ClassBooking.status != BookingStatusEnum.Cancelled,
        )
        .order_by(ClassBooking.class_date)
        .all()
    )


@router.delete("/bookings/{booking_id}", response_model=BookingResponse)
def cancel_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    booking = db.query(ClassBooking).filter(ClassBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    assert_self_or_roles(user, booking.trainee_id, *STAFF_ROLES)

    booking.status = BookingStatusEnum.Cancelled
    db.commit()
    db.refresh(booking)
    return booking


# --------------------------------------------------
# CLASS ROSTER (staff)
# --------------------------------------------------
@router.get("/{class_id}/roster", response_model=list[BookingResponse])
def class_roster(
    class_id: UUID,
    class_date: date_type,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    return (
        db.query(ClassBooking)
        .filter(
            ClassBooking.class_id == class_id,
            ClassBooking.class_date == class_date,
            ClassBooking.status != BookingStatusEnum.Cancelled,
        )
        .all()
    )
