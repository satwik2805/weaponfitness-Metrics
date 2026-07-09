from app.core.database import engine
from app.db.base import Base
# Import all models to ensure they are registered
from app.db.models.attendance import Attendance
from app.db.models.workout import CustomTraineeWeeklyWorkout, GroupWeeklyWorkout
from app.db.models.workout_schedule import WorkoutSchedule
from app.db.models.trainee import Trainee
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from app.db.models.daily_nutrition import DailyNutrition

print("Creating all missing tables...")
Base.metadata.create_all(bind=engine)
print("Tables created.")
