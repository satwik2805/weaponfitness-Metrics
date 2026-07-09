import sys
import os

# Add the backend directory to sys.path so we can import the app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.app.services.vision_service import detect_food_from_bytes
    print("✅ Vision Service imported successfully!")
    print("🚀 YOLOv8 model is ready for detection.")
except ImportError as e:
    print(f"❌ Failed to import Vision Service: {e}")
except Exception as e:
    print(f"❌ Error initializing model: {e}")
