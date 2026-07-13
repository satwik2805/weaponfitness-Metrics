import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.auth import get_current_user
from app.core.config import settings

from app.api.profile import router as profile_router
from app.api.branch import router as branch_router
from app.api.trainer import router as trainer_router
from app.api.trainee import router as trainee_router
from app.api.membership import router as membership_router
from app.api.payment import router as payment_router
from app.api.attendance import router as attendance_router
from app.api.sleep import router as sleep_router
from app.api.sleep_reminder import router as sleep_reminder_router
from app.api.workout_log import router as workout_log_router
from app.api.workout_reminder import router as workout_reminder_router
from app.api.push_token import router as push_token_router
from app.api.nutrition import router as nutrition_router
from app.api.motivation import router as motivation_router
from app.api.gamification import router as gamification_router
from app.api.consistency import router as consistency_router
from app.api.trainer_attendance import router as trainer_attendance_router
from app.api.group import router as group_router
from app.api.gym_class import router as gym_class_router
from app.api.register import router as register_router

from app.services.sleep_scheduler import check_sleep_reminders
from app.services.workout_reminder_scheduler import check_workout_reminders

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("weaponfitness")

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not scheduler.running:
        scheduler.add_job(
            check_sleep_reminders, "interval", minutes=1,
            id="sleep_reminder_job", replace_existing=True, coalesce=True, max_instances=1,
        )
        scheduler.add_job(
            check_workout_reminders, "interval", minutes=1,
            id="workout_reminder_job", replace_existing=True, coalesce=True, max_instances=1,
        )
        scheduler.start()
        logger.info("Schedulers started: sleep_reminder_job, workout_reminder_job")
    yield
    if scheduler.running:
        scheduler.shutdown()


app = FastAPI(title="WeaponFitness API", lifespan=lifespan)

# -------------------- CORS --------------------
# When ALLOWED_ORIGINS is literally "*", we enable open access but MUST
# disable credentials (the CORS spec forbids wildcard + credentials and
# browsers silently block every response). For an explicit origin list,
# credentials stay on so the frontend can send its Supabase JWT cookie.
_origins = settings.allowed_origins_list
_wildcard = _origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard else _origins,
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Full trace stays in server logs; clients get a generic envelope.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our side. Please try again."},
    )


# -------------------- Routers --------------------
# Every business router requires a verified Supabase JWT (see app/core/auth.py).
# Fine-grained role/ownership checks live inside the routers; profile.py is
# the exemplar pattern. Health endpoints below stay public.
AUTH = [Depends(get_current_user)]

app.include_router(profile_router, prefix="/profiles", tags=["Profiles"], dependencies=AUTH)
app.include_router(branch_router, prefix="/branches", tags=["Branches"], dependencies=AUTH)
app.include_router(trainer_router, prefix="/trainers", tags=["Trainers"], dependencies=AUTH)
app.include_router(trainee_router, prefix="/trainees", tags=["Trainees"], dependencies=AUTH)
app.include_router(membership_router, prefix="/memberships", tags=["Memberships"], dependencies=AUTH)
app.include_router(payment_router, prefix="/payments", tags=["Payments"], dependencies=AUTH)
app.include_router(sleep_router, dependencies=AUTH)
app.include_router(sleep_reminder_router, dependencies=AUTH)
app.include_router(attendance_router, prefix="/attendance", tags=["Attendance"], dependencies=AUTH)
app.include_router(workout_log_router, prefix="/workout-logs", tags=["Workout Logs"], dependencies=AUTH)
app.include_router(workout_reminder_router, prefix="/workout-reminders", tags=["Workout Reminders"], dependencies=AUTH)
app.include_router(push_token_router, prefix="/push", tags=["Push Notifications"], dependencies=AUTH)
app.include_router(group_router, prefix="/trainee-groups", tags=["Groups"], dependencies=AUTH)
app.include_router(nutrition_router, dependencies=AUTH)
app.include_router(motivation_router, dependencies=AUTH)
app.include_router(gamification_router, prefix="/api/gamification", tags=["Gamification"], dependencies=AUTH)
app.include_router(consistency_router, prefix="/consistency", tags=["Consistency"], dependencies=AUTH)
app.include_router(trainer_attendance_router, prefix="/trainer-attendance", tags=["TrainerAttendance"], dependencies=AUTH)
app.include_router(gym_class_router, prefix="/classes", tags=["Classes"], dependencies=AUTH)
app.include_router(register_router, prefix="/register", tags=["Registration"], dependencies=AUTH)


# -------------------- Health --------------------
@app.get("/")
def root():
    return {"status": "API Running"}


@app.get("/ping")
def ping():
    return {"message": "Backend working"}
