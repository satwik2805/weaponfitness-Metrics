# 🏋️ Workout Tracking System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WeaponFitness App                             │
│                     Workout Tracking System                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   Trainee Arrives    │         │  Trainee Sets        │
│   at Gym             │         │  Reminder            │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Scans QR Code /     │         │  Opens Reminder      │
│  Manual Check-in     │         │  Settings            │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Attendance Record   │         │  Creates Reminder    │
│  Created             │         │  (Time + Days)       │
│  is_present = true   │         └──────────┬───────────┘
└──────────┬───────────┘                    │
           │                                 ▼
           ▼                      ┌──────────────────────┐
┌──────────────────────┐         │  Stored in DB        │
│  Auto-Create         │         │  workout_reminders   │
│  Workout Log         │         └──────────┬───────────┘
└──────────┬───────────┘                    │
           │                                 ▼
           ▼                      ┌──────────────────────┐
┌──────────────────────┐         │  Background          │
│  Stored in DB        │         │  Scheduler           │
│  workout_logs        │         │  (Every Minute)      │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Trainee Can Add:    │         │  Checks Time & Day   │
│  - Duration          │         │  Matches Reminder    │
│  - Notes             │         └──────────┬───────────┘
└──────────┬───────────┘                    │
           │                                 ▼
           ▼                      ┌──────────────────────┐
┌──────────────────────┐         │  Sends Notification  │
│  View Statistics     │         │  (To Be Implemented) │
│  - Total Workouts    │         └──────────────────────┘
│  - Avg Duration      │
│  - Workouts/Week     │
└──────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                         Database Tables                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   attendance     │         │   trainees       │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ trainee_id (FK)  │────────▶│ name             │
│ attendance_date  │         │ email            │
│ is_present       │         │ ...              │
└────────┬─────────┘         └──────────────────┘
         │                            ▲
         │                            │
         │                            │
         ▼                            │
┌──────────────────┐                 │
│  workout_logs    │                 │
├──────────────────┤                 │
│ id (PK)          │                 │
│ trainee_id (FK)  │─────────────────┘
│ attendance_id(FK)│
│ workout_date     │
│ is_completed     │
│ duration_minutes │
│ notes            │
│ auto_tracked     │
└──────────────────┘

┌──────────────────┐
│workout_reminders │
├──────────────────┤
│ id (PK)          │
│ trainee_id (FK)  │─────────────────┐
│ reminder_time    │                 │
│ days_of_week     │                 │
│ message          │                 ▼
│ is_active        │         ┌──────────────────┐
└──────────────────┘         │   trainees       │
                             └──────────────────┘
```

## API Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          API Endpoints                           │
└─────────────────────────────────────────────────────────────────┘

Frontend (React Native)
    │
    ├─── GET /workout-logs/trainee/{id} ────▶ Backend
    │                                            │
    │                                            ▼
    │                                    ┌──────────────┐
    │                                    │   Database   │
    │                                    │   Query      │
    │                                    └──────┬───────┘
    │                                            │
    │    ◀──── JSON Response (Workout Logs) ────┘
    │
    ├─── GET /workout-logs/trainee/{id}/stats ─▶ Backend
    │                                            │
    │                                            ▼
    │                                    ┌──────────────┐
    │                                    │  Calculate   │
    │                                    │  Statistics  │
    │                                    └──────┬───────┘
    │                                            │
    │    ◀──── JSON Response (Stats) ───────────┘
    │
    ├─── POST /workout-reminders/ ─────────────▶ Backend
    │                                            │
    │                                            ▼
    │                                    ┌──────────────┐
    │                                    │   Create     │
    │                                    │   Reminder   │
    │                                    └──────┬───────┘
    │                                            │
    │    ◀──── JSON Response (Created) ─────────┘
    │
    └─── POST /attendance/ ────────────────────▶ Backend
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │   Create     │
                                         │  Attendance  │
                                         └──────┬───────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │ Auto-Create  │
                                         │ Workout Log  │
                                         └──────────────┘
```

## Scheduler Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Background Scheduler                          │
└─────────────────────────────────────────────────────────────────┘

Backend Server Starts
        │
        ▼
┌──────────────────┐
│  APScheduler     │
│  Initialized     │
└────────┬─────────┘
         │
         ├─── Sleep Reminder Job (Every 1 min)
         │         │
         │         ▼
         │    ┌──────────────────┐
         │    │ Check sleep      │
         │    │ reminders table  │
         │    └──────────────────┘
         │
         └─── Workout Reminder Job (Every 1 min)
                   │
                   ▼
              ┌──────────────────┐
              │ Check workout    │
              │ reminders table  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Current time =   │
              │ reminder time?   │
              └────────┬─────────┘
                       │
                       ├─── Yes ───▶ ┌──────────────────┐
                       │             │ Current day in   │
                       │             │ days_of_week?    │
                       │             └────────┬─────────┘
                       │                      │
                       │                      ├─── Yes ───▶ Send Notification
                       │                      │
                       │                      └─── No ────▶ Skip
                       │
                       └─── No ────▶ Skip
```

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Components                           │
└─────────────────────────────────────────────────────────────────┘

TraineeHomeScreen
    │
    ├─── Tab: Home
    │     └─── (Existing content)
    │
    ├─── Tab: Workouts
    │     └─── WorkoutTracker
    │           ├─── Stats Dashboard
    │           │     ├─── Total Workouts
    │           │     ├─── Workouts/Week
    │           │     └─── Avg Duration
    │           │
    │           └─── Workout Logs List
    │                 └─── Workout Log Card
    │                       ├─── Date
    │                       ├─── Duration
    │                       ├─── Notes
    │                       └─── Edit Button
    │
    └─── Tab: Reminders
          └─── WorkoutReminderSettings
                ├─── Create Reminder Form
                │     ├─── Time Picker
                │     ├─── Day Selector
                │     └─── Create Button
                │
                └─── Reminders List
                      └─── Reminder Card
                            ├─── Time Display
                            ├─── Days Display
                            ├─── Toggle Switch
                            └─── Delete Button
```

## Data Flow Example

```
┌─────────────────────────────────────────────────────────────────┐
│              Example: Trainee Marks Attendance                   │
└─────────────────────────────────────────────────────────────────┘

1. Trainee scans QR code at gym
        ↓
2. Frontend sends POST to /attendance/
   {
     "trainee_id": "abc-123",
     "attendance_date": "2026-01-26",
     "is_present": true
   }
        ↓
3. Backend creates attendance record
        ↓
4. Backend checks: is_present == true AND trainee_id exists?
        ↓ YES
5. Backend calls auto_create_workout_log_from_attendance()
        ↓
6. Backend queries workout_schedules for today's workout
        ↓
7. Backend creates workout_log:
   {
     "trainee_id": "abc-123",
     "attendance_id": "def-456",
     "workout_template_id": "ghi-789",  // if scheduled
     "workout_date": "2026-01-26",
     "is_completed": true,
     "auto_tracked": true
   }
        ↓
8. Backend returns attendance record to frontend
        ↓
9. Trainee can later view workout log in Workouts tab
        ↓
10. Trainee can add duration and notes
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Integration                            │
└─────────────────────────────────────────────────────────────────┘

Existing System              New Features
     │                            │
     ├─── Attendance ────────────▶├─── Workout Logs (Auto-created)
     │                            │
     ├─── Workout Schedules ─────▶├─── Linked to Logs
     │                            │
     ├─── Trainees ──────────────▶├─── Workout Reminders
     │                            │
     └─── Sleep Tracking ────────▶└─── Similar Pattern Used
```

This architecture ensures:
✅ Automatic tracking without manual input
✅ Seamless integration with existing features
✅ Scalable reminder system
✅ Clean separation of concerns
✅ Easy to extend and maintain
