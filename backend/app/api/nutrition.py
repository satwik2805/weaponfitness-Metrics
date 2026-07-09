import logging

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
import uuid
from datetime import date, datetime
from typing import List
from pydantic import BaseModel

from app.core.auth import STAFF_ROLES, AuthUser, assert_self_or_roles, get_current_user
from app.core.database import get_db
from app.services.consistency_service import update_daily_consistency
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from app.db.models.daily_nutrition import DailyNutrition
from app.schemas.nutrition import (
    NutritionLogCreate, 
    NutritionLogResponse, 
    NutrientGoalCreate, 
    NutrientGoalResponse,
    DailyNutritionSummary,
    DailyLogCreate,
    DailyLogResponse
)

logger = logging.getLogger("weaponfitness.nutrition")

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])

# DAILY LOG (Reflection)
@router.post("/daily-log", response_model=DailyLogResponse)
def create_daily_log(data: DailyLogCreate, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, data.trainee_id, *STAFF_ROLES)
    # Check if exists for this date
    log = db.query(DailyNutrition).filter(
        DailyNutrition.trainee_id == data.trainee_id,
        DailyNutrition.date == data.date
    ).first()
    
    if log:
        # Update
        log.quality_rating = data.quality_rating
        log.notes = data.notes
    else:
        # Create
        log = DailyNutrition(**data.model_dump())
        db.add(log)
    
    db.commit()
    db.refresh(log)

    #  Update daily consistency (Trifecta tracking)
    try:
        update_daily_consistency(db, log.trainee_id, log.date)
    except Exception:
        logger.exception("Failed to update consistency on daily log for trainee %s", log.trainee_id)

    return log

# LOGS
@router.post("/log", response_model=NutritionLogResponse)
def create_nutrition_log(data: NutritionLogCreate, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, data.trainee_id, *STAFF_ROLES)
    log = NutritionLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)

    #  Update daily consistency
    try:
        update_daily_consistency(db, log.trainee_id, log.log_date.date() if isinstance(log.log_date, datetime) else log.log_date)
    except Exception:
        logger.exception("Failed to update consistency on nutrition log for trainee %s", log.trainee_id)

    return log

@router.get("/logs/{trainee_id}", response_model=List[NutritionLogResponse])
def get_nutrition_logs(trainee_id: UUID, log_date: date = None, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    query = db.query(NutritionLog).filter(NutritionLog.trainee_id == trainee_id)
    if log_date:
        # Filter by date part of log_date
        query = query.filter(func.date(NutritionLog.log_date) == log_date)
    else:
        # Default to today
        query = query.filter(func.date(NutritionLog.log_date) == date.today())
    
    return query.order_by(NutritionLog.created_at.desc()).all()

# GOALS
@router.post("/goals", response_model=NutrientGoalResponse)
def set_nutrient_goal(data: NutrientGoalCreate, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, data.trainee_id, *STAFF_ROLES)
    # Check if goal already exists
    goal = db.query(NutrientGoal).filter(NutrientGoal.trainee_id == data.trainee_id).first()
    if goal:
        for key, value in data.model_dump().items():
            setattr(goal, key, value)
    else:
        goal = NutrientGoal(**data.model_dump())
        db.add(goal)
    
    db.commit()
    db.refresh(goal)
    return goal

@router.get("/goals/{trainee_id}", response_model=NutrientGoalResponse)
def get_nutrient_goal(trainee_id: UUID, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    goal = db.query(NutrientGoal).filter(NutrientGoal.trainee_id == trainee_id).first()
    if not goal:
        # Return defaults if not set
        return NutrientGoal(
            trainee_id=trainee_id,
            id=uuid.uuid4(),
            updated_at=datetime.now(),
            daily_calories=2000.0,
            daily_protein=150.0,
            daily_carbs=200.0,
            daily_fats=70.0
        )
    return goal

# SUMMARY
@router.get("/daily/{trainee_id}", response_model=DailyNutritionSummary)
def get_daily_summary(trainee_id: UUID, query_date: date = None, db: Session = Depends(get_db), user: AuthUser = Depends(get_current_user)):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    try:
        if not query_date:
            query_date = date.today()
            
        logs = db.query(NutritionLog).filter(
            NutritionLog.trainee_id == trainee_id,
            func.date(NutritionLog.log_date) == query_date
        ).all()
        
        # Helper to safely serialize goal (Handling NULLs)
        def safe_goal_response(g):
            if not g:
                return NutrientGoalResponse(
                    id=uuid.uuid4(),
                    trainee_id=trainee_id,
                    updated_at=datetime.now(),
                    daily_calories=2000.0,
                    daily_protein=150.0,
                    daily_carbs=200.0,
                    daily_fats=70.0
                )
            return NutrientGoalResponse(
                id=g.id,
                trainee_id=g.trainee_id,
                updated_at=g.updated_at,
                daily_calories=g.daily_calories if g.daily_calories is not None else 2000.0,
                daily_protein=g.daily_protein if g.daily_protein is not None else 150.0,
                daily_carbs=g.daily_carbs if g.daily_carbs is not None else 200.0,
                daily_fats=g.daily_fats if g.daily_fats is not None else 70.0
            )

        goal_orm = db.query(NutrientGoal).filter(NutrientGoal.trainee_id == trainee_id).first()
        goal_resp = safe_goal_response(goal_orm)
            
        # Get daily reflection log
        daily_log = db.query(DailyNutrition).filter(
            DailyNutrition.trainee_id == trainee_id,
            DailyNutrition.date == query_date
        ).first()
        
        total_cal = sum(l.calories for l in logs)
        total_pro = sum(l.protein for l in logs)
        total_carb = sum(l.carbs for l in logs)
        total_fat = sum(l.fats for l in logs)
        
        return DailyNutritionSummary(
            date=query_date,
            total_calories=total_cal,
            total_protein=total_pro,
            total_carbs=total_carb,
            total_fats=total_fat,
            goals=goal_resp,
            logs=logs,
            daily_log=daily_log
        )
    except Exception:
        logger.exception("Error building daily nutrition summary for trainee %s", trainee_id)
        raise HTTPException(status_code=500, detail="Couldn't load your nutrition summary. Please try again.")

# ----------------- SMART PARSE -----------------
class ParseRequest(BaseModel):
    text: str

class ParseItem(BaseModel):
    item_name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    quantity: str

class ParseResponse(BaseModel):
    items: List[ParseItem]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float

# Simple "AI" lookup table for common gym-friendly bodybuilding dishes categorized by cuisine
FOOD_DB = {
    "Indian": {
        "boiled chicken & broccoli": {"cal": 130, "pro": 25, "carb": 3, "fat": 2},
        "grilled paneer tikka": {"cal": 180, "pro": 18, "carb": 4, "fat": 10},
        "sprouts & moong dal salad": {"cal": 110, "pro": 8, "carb": 18, "fat": 0.5},
        "egg white scramble": {"cal": 90, "pro": 18, "carb": 2, "fat": 0.5},
        "roasted chana": {"cal": 160, "pro": 10, "carb": 24, "fat": 2},
        "masala soya bhurji": {"cal": 130, "pro": 20, "carb": 8, "fat": 2},
        "sattu protein shake": {"cal": 180, "pro": 12, "carb": 28, "fat": 2},
        "moong dal chilla": {"cal": 140, "pro": 9, "carb": 22, "fat": 1.5},
        "curd & oats mash": {"cal": 150, "pro": 8, "carb": 24, "fat": 2},
        "boiled kala chana": {"cal": 120, "pro": 7, "carb": 20, "fat": 1.5},
    },
    "Italian": {
        "whole wheat chicken pasta": {"cal": 140, "pro": 12, "carb": 18, "fat": 2},
        "baked chicken parmesan": {"cal": 180, "pro": 26, "carb": 4, "fat": 6},
        "turkey meatballs in marinara": {"cal": 135, "pro": 15, "carb": 6, "fat": 5},
        "tuna spinach cannelloni": {"cal": 150, "pro": 14, "carb": 16, "fat": 3},
    },
    "American / Western": {
        "grilled chicken and sweet potato": {"cal": 130, "pro": 15, "carb": 14, "fat": 1.5},
        "beef sirloin steak": {"cal": 190, "pro": 24, "carb": 2, "fat": 9},
        "oatmeal protein porridge": {"cal": 110, "pro": 9, "carb": 14, "fat": 2},
        "egg white omelette": {"cal": 55, "pro": 10, "carb": 1, "fat": 0.2},
        "grilled turkey breast": {"cal": 135, "pro": 28, "carb": 0, "fat": 2.2},
    },
    "Asian": {
        "steamed tofu with jasmine rice": {"cal": 110, "pro": 5, "carb": 18, "fat": 2},
        "garlic ginger shrimp stir fry": {"cal": 95, "pro": 16, "carb": 4, "fat": 1.5},
        "teriyaki chicken breast bowl": {"cal": 135, "pro": 14, "carb": 16, "fat": 2},
        "steamed edamame": {"cal": 122, "pro": 11, "carb": 10, "fat": 5},
    },
    "Mediterranean": {
        "grilled salmon with quinoa": {"cal": 165, "pro": 12, "carb": 11, "fat": 8},
        "mediterranean tuna salad": {"cal": 120, "pro": 16, "carb": 3, "fat": 5},
        "greek yogurt bowl with berries": {"cal": 80, "pro": 8, "carb": 10, "fat": 0.4},
        "grilled chicken souvlaki": {"cal": 140, "pro": 22, "carb": 2, "fat": 4},
    }
}

@router.post("/parse", response_model=ParseResponse)
def parse_nutrition_text(req: ParseRequest):
    import re
    text = req.text.lower()
    items = []
    
    # Split by "and" or "," 
    parts = re.split(r' and |,', text)
    
    total_cal = 0
    total_pro = 0
    total_carb = 0
    total_fat = 0
    
    for part in parts:
        part = part.strip()
        if not part: continue
        
        # Try to extract quantity (e.g., "3 eggs", "100g rice")
        qty_match = re.match(r'^(\d+(?:\.\d+)?)\s*(.*)', part)
        if qty_match:
            val = float(qty_match.group(1))
            food = qty_match.group(2).strip()
        else:
            val = 1
            food = part
            
        # Match against our mini "AI" DB (nested by cuisine)
        matched_data = None
        for cuisine, foods in FOOD_DB.items():
            for key, macros in foods.items():
                if key in food:
                    matched_data = macros
                    break
            if matched_data:
                break
        
        if matched_data:
            # Simple scaling logic
            # If it's a known unit in the text like 'g' or 'gram', we assume DB is per 100g
            is_grams = 'g' in food or 'gram' in food
            scale = val / 100 if is_grams else val
            
            p_item = ParseItem(
                item_name=food.capitalize(),
                calories=matched_data["cal"] * scale,
                protein=matched_data["pro"] * scale,
                carbs=matched_data["carb"] * scale,
                fats=matched_data["fat"] * scale,
                quantity=f"{val} {food}" if not is_grams else f"{val}g {food}"
            )
            items.append(p_item)
            
            total_cal += p_item.calories
            total_pro += p_item.protein
            total_carb += p_item.carbs
            total_fat += p_item.fats
        else:
            # Fallback for unknown foods (set everything to 0 or generic values)
            items.append(ParseItem(
                item_name=food.capitalize(),
                calories=0, protein=0, carbs=0, fats=0,
                quantity=part
            ))
            
    return ParseResponse(
        items=items,
        total_calories=total_cal,
        total_protein=total_pro,
        total_carbs=total_carb,
        total_fats=total_fat
    )

# ----------------- GET FOOD LIBRARY -----------------
@router.get("/library")
def get_food_library():
    return FOOD_DB

# ----------------- SMART IMAGE DETECT (MOCK) -----------------
@router.post("/detect", response_model=ParseResponse)
def detect_food_image(file: UploadFile = File(...), user: AuthUser = Depends(get_current_user)):
    filename = file.filename.lower() if file.filename else ""
    
    # Try to match words in the filename against our food database
    matched_food = None
    for cuisine, foods in FOOD_DB.items():
        for key in foods:
            if key in filename:
                matched_food = (key, foods[key])
                break
        if matched_food:
            break
            
    items = []
    if matched_food:
        # Match found! Return the matched food from the database
        food_name, food_data = matched_food
        items.append(ParseItem(
            item_name=food_name.capitalize(),
            calories=food_data["cal"],
            protein=food_data["pro"],
            carbs=food_data["carb"],
            fats=food_data["fat"],
            quantity="1 serving"
        ))
    else:
        # Default mock items representing a healthy meal
        # so the user gets realistic mock data to test the workflow
        default_foods = ["egg white scramble", "oatmeal protein porridge", "steamed tofu with jasmine rice"]
        for food in default_foods:
            food_data = None
            for cuisine, foods in FOOD_DB.items():
                if food in foods:
                    food_data = foods[food]
                    break
            if food_data:
                items.append(ParseItem(
                    item_name=food.capitalize(),
                    calories=food_data["cal"],
                    protein=food_data["pro"],
                    carbs=food_data["carb"],
                    fats=food_data["fat"],
                    quantity="1 serving"
                ))
            
    total_cal = sum(i.calories for i in items)
    total_pro = sum(i.protein for i in items)
    total_carb = sum(i.carbs for i in items)
    total_fat = sum(i.fats for i in items)
    
    return ParseResponse(
        items=items,
        total_calories=total_cal,
        total_protein=total_pro,
        total_carbs=total_carb,
        total_fats=total_fat
    )
