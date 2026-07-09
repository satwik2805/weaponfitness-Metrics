"""Payments API.

Authorization model (on top of router-wide JWT auth in main.py):
- Payments are financial records; Trainers have no business with them.
- Create/Delete: front-desk staff operations (Owner/Admin/Receptionist).
- Read by id: the payer themselves (payment.profile_id), or front-desk staff.
- List all: front-desk staff only (Owner/Admin/Receptionist).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import (
    ADMIN_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.payment import Payment
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse
)

router = APIRouter()

# Roles that handle money at the front desk. Trainer is deliberately excluded.
PAYMENT_STAFF = (*ADMIN_ROLES, "Receptionist")


# CREATE (staff only — members never record their own payments)
@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*PAYMENT_STAFF)),
):
    db_payment = Payment(**payment.model_dump())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

# READ (by id): the payer themselves, or front-desk staff
@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    assert_self_or_roles(user, payment.profile_id, *PAYMENT_STAFF)
    return payment

# READ (all): front-desk staff only
@router.get("/", response_model=list[PaymentResponse])
def list_payments(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*PAYMENT_STAFF)),
):
    return db.query(Payment).all()

# DELETE (staff only)
@router.delete("/{payment_id}")
def delete_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*PAYMENT_STAFF)),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted successfully"}
