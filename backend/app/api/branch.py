from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.branch import Branch
from app.schemas.branch import (
    BranchCreate,
    BranchUpdate,
    BranchResponse
)

router = APIRouter()

# CREATE
@router.post(
    "/",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED
)
def create_branch(
    branch: BranchCreate,
    db: Session = Depends(get_db),
    # Branch mutations are Owner/Admin only.
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    db_branch = Branch(**branch.model_dump())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch


# READ (single)
@router.get(
    "/{branch_id}",
    response_model=BranchResponse
)
def get_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    # Any authenticated user: branch details are non-sensitive location info
    # a member needs to see (their own gym's name/address).
    user: AuthUser = Depends(get_current_user),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    return branch


# READ (all)
@router.get(
    "/",
    response_model=List[BranchResponse]
)
def list_branches(
    db: Session = Depends(get_db),
    # Listing all branches is a staff (dashboard) view.
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    return db.query(Branch).all()


# UPDATE (PUT)
@router.put(
    "/{branch_id}",
    response_model=BranchResponse
)
def update_branch(
    branch_id: UUID,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    # Branch mutations are Owner/Admin only.
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    for key, value in branch_data.model_dump(exclude_unset=True).items():
        setattr(branch, key, value)

    db.commit()
    db.refresh(branch)
    return branch


# DELETE
@router.delete(
    "/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    # Branch mutations are Owner/Admin only.
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    db.delete(branch)
    db.commit()
    return None
