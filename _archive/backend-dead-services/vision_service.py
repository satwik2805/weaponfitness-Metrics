import logging
from ultralytics import YOLO
import cv2
import numpy as np
import io
from PIL import Image
import os
import datetime

logger = logging.getLogger("weaponfitness.vision")

# Initialize YOLOv8 model
model = YOLO('yolov8n.pt')

# Extended Food DB
FOOD_CALORIES = {
    "banana": {"cal": 89, "pro": 1.1, "carb": 23, "fat": 0.3},
    "apple": {"cal": 52, "pro": 0.3, "carb": 14, "fat": 0.2},
    "orange": {"cal": 47, "pro": 0.9, "carb": 12, "fat": 0.1},
    "broccoli": {"cal": 34, "pro": 2.8, "carb": 7, "fat": 0.4},
    "carrot": {"cal": 41, "pro": 0.9, "carb": 10, "fat": 0.2},
    "hot dog": {"cal": 150, "pro": 5, "carb": 2, "fat": 13},
    "pizza": {"cal": 266, "pro": 11, "carb": 33, "fat": 10},
    "donut": {"cal": 452, "pro": 4.9, "carb": 51, "fat": 25},
    "cake": {"cal": 257, "pro": 2, "carb": 42, "fat": 10},
    "sandwich": {"cal": 250, "pro": 12, "carb": 30, "fat": 9},
    "cup": {"cal": 0, "pro": 0, "carb": 0, "fat": 0},
    "bowl": {"cal": 200, "pro": 5, "carb": 30, "fat": 5},
    "burger": {"cal": 354, "pro": 17, "carb": 31, "fat": 17},
    "rice": {"cal": 130, "pro": 2.7, "carb": 28, "fat": 0.3},
    "chicken": {"cal": 239, "pro": 27, "carb": 0, "fat": 14},
    "salad": {"cal": 100, "pro": 3, "carb": 10, "fat": 5},
    "pasta": {"cal": 131, "pro": 5, "carb": 25, "fat": 1},
    "egg": {"cal": 155, "pro": 13, "carb": 1.1, "fat": 11},
}

# Items that make sense to count individually
COUNTABLE_ITEMS = ["apple", "banana", "orange", "carrot", "egg", "hot dog", "donut", "sandwich", "burger", "cake"]

# Permitted classes (Strict allowlist to ignore "person", "ball", "frisbee", etc.)
ALLOWED_CLASSES = [
    # Specific Food
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    # Mappings
    "sports ball", "potted plant",
    # Tableware / Context (often contains food)
    "bottle", "cup", "fork", "knife", "spoon", "bowl", "dining table"
]

def detect_food(image_bytes: bytes):
    if not image_bytes:
        logger.warning("Received empty image bytes")
        return [{
            "item_name": "Error: Empty Image",
            "confidence": 0,
            "calories": 0, "protein": 0, "carbs": 0, "fats": 0,
            "quantity": "Retry"
        }]

    try:
        # 1. DEBUG: Save received image
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        debug_filename = f"debug_upload_{timestamp}.jpg"
        with open(debug_filename, "wb") as f:
            f.write(image_bytes)
        logger.debug("Saved debug image to %s (%d bytes)", debug_filename, len(image_bytes))

        # 2. Load image
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        img_array = np.array(image)
        
        # 3. Detection
        # conf=0.15 to filter very weak garbage, but low enough for food
        results = model(img_array, conf=0.15) 
        
        # Store counts of items found
        item_counts = {}
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                label = model.names[cls_id]
                conf = float(box.conf[0])
                
                # --- STRICT FILTERING START ---
                if label not in ALLOWED_CLASSES:
                    logger.debug("Ignored non-food: %s (%.2f)", label, conf)
                    continue
                # --- STRICT FILTERING END ---

                logger.debug("Detected: %s (%.2f)", label, conf)
                
                # --- HEURISTICS FOR FOOD MAPPING ---
                # Remap "sports ball" -> "Egg" (Common visual similarity in food context)
                if label == "sports ball":
                    label = "egg"

                # Remap "potted plant" -> "Salad" (Visual similarity to leafy greens)
                if label == "potted plant":
                    label = "salad"

                # Remap some common non-food items to "context"
                if label in ["bowl", "cup", "dining table", "spoon", "fork", "knife", "bottle"]:
                    label = "Unknown Meal (context)"
                    
                if label in item_counts:
                    item_counts[label]["count"] += 1
                    item_counts[label]["max_conf"] = max(item_counts[label]["max_conf"], conf)
                else:
                    item_counts[label] = {"count": 1, "max_conf": conf}
                    
        # 4. Process Counts into Final List
        detected_items = []
        
        # If we have specific food items, try to filter out generic "Unknown Meal" context
        has_real_food = any(k != "Unknown Meal (context)" for k in item_counts.keys())
        
        for label, info in item_counts.items():
            count = info["count"]
            conf = info["max_conf"]
            
            # If we found real food (e.g. Apple), skip the "Bowl" or "Table" detection
            if has_real_food and label == "Unknown Meal (context)":
                continue

            # Lookup Nutrition logic
            data = FOOD_CALORIES.get(label)
            
            # Fallback
            if not data:
                if label == "Unknown Meal (context)":
                     data = {"cal": 300, "pro": 10, "carb": 40, "fat": 10}
                elif label == "egg": # Should be in DB, but just in case
                     data = {"cal": 78, "pro": 6, "carb": 0.6, "fat": 5}
                elif label == "salad":
                     data = {"cal": 50, "pro": 2, "carb": 5, "fat": 0}
                else:
                     data = {"cal": 100, "pro": 0, "carb": 0, "fat": 0}

            # Quantity Logic
            quantity_text = "1 serving"
            total_cal = data["cal"]
            total_pro = data["pro"]
            total_carb = data["carb"]
            total_fat = data["fat"]

            if label in COUNTABLE_ITEMS and count > 1:
                quantity_text = f"{count} items"
                # Multiply stats by count
                total_cal *= count
                total_pro *= count
                total_carb *= count
                total_fat *= count
            elif count > 1:
                 quantity_text = f"{count} servings"
                 total_cal *= count
                 total_pro *= count
                 total_carb *= count
                 total_fat *= count

            detected_items.append({
                "item_name": label.capitalize(),
                "confidence": conf,
                "calories": total_cal,
                "protein": total_pro,
                "carbs": total_carb,
                "fats": total_fat,
                "quantity": quantity_text
            })

        # Fallback if list is empty
        if not detected_items:
            logger.warning("No objects detected by YOLO. Returning fallback.")
            detected_items.append({
                "item_name": "Unidentified Food",
                "confidence": 0.0,
                "calories": 0, "protein": 0, "carbs": 0, "fats": 0,
                "quantity": "1 item"
            })
            
        return detected_items

    except Exception:
        logger.exception("Error during vision processing")
        return [{
            "item_name": "Error Analyzing",
            "confidence": 0,
            "calories": 0, "protein": 0, "carbs": 0, "fats": 0,
            "quantity": "Retry"
        }]
