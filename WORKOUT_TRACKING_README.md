# 🏋️ Workout Tracking & Reminders - README

## 🎯 What's New?

Your WeaponFitness app now includes **automatic workout tracking** and **customizable workout reminders**!

### ✨ Key Features

1. **Automatic Workout Tracking**
   - Workouts are automatically logged when trainees check in at the gym
   - No manual entry required!
   - Trainees can add duration and notes later

2. **Workout Statistics**
   - See total workouts in the last 30 days
   - Track average workout duration
   - Monitor workouts per week

3. **Smart Reminders**
   - Set custom reminder times
   - Choose specific days (e.g., Mon/Wed/Fri) or daily
   - Toggle reminders on/off without deleting
   - Multiple reminders supported

## 🚀 Quick Start

### For Developers

1. **Create Database Tables**
   ```bash
   cd backend
   python create_workout_tables.py
   ```

2. **Start Backend**
   ```bash
   python main.py
   ```
   Look for: `✅ Schedulers started: sleep_reminder_job, workout_reminder_job`

3. **Install Frontend Dependencies**
   ```bash
   npm install @react-native-community/datetimepicker
   ```

4. **Integrate Components**
   Add to your `TraineeHomeScreen.js`:
   ```javascript
   import WorkoutTracker from '../components/WorkoutTracker';
   import WorkoutReminderSettings from '../components/WorkoutReminderSettings';
   
   // In your component:
   <WorkoutTracker traineeId={traineeId} />
   <WorkoutReminderSettings traineeId={traineeId} />
   ```

### For Users (Trainees)

1. **View Your Workouts**
   - Open the Workouts tab
   - See your workout history and statistics
   - Add duration and notes to past workouts

2. **Set Up Reminders**
   - Open the Reminders tab
   - Tap "+ Add Reminder"
   - Choose your preferred time
   - Select days (or leave empty for daily)
   - Tap "Create Reminder"

3. **Manage Reminders**
   - Toggle reminders on/off with the switch
   - Delete reminders you no longer need
   - Create multiple reminders if desired

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **IMPLEMENTATION_SUMMARY.md** | Complete overview of the implementation |
| **WORKOUT_TRACKING_GUIDE.md** | Detailed guide with setup and usage |
| **API_QUICK_REFERENCE.md** | API endpoints reference |
| **SYSTEM_ARCHITECTURE.md** | Visual architecture diagrams |
| **IMPLEMENTATION_CHECKLIST.md** | Testing and verification checklist |
| **INTEGRATION_EXAMPLE.js** | Example code for integration |

## 🎨 Screenshots (To Be Added)

### Workout Tracker
- Stats dashboard showing workout metrics
- List of recent workouts
- Add details form

### Workout Reminders
- Time picker interface
- Day selector
- Active reminders list

## 🔧 Technical Details

### Backend Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL (Supabase)
- **Scheduler**: APScheduler
- **ORM**: SQLAlchemy

### Frontend Stack
- **Framework**: React Native
- **HTTP Client**: Axios
- **Date/Time**: @react-native-community/datetimepicker

### New Database Tables
- `workout_logs` - Stores completed workouts
- `workout_reminders` - Stores reminder preferences

### New API Endpoints
- `/workout-logs/*` - Workout log management
- `/workout-reminders/*` - Reminder management

## 🔄 How It Works

### Automatic Tracking Flow
```
Trainee checks in → Attendance created → Workout log auto-created → 
Trainee can add details → Statistics updated
```

### Reminder Flow
```
Trainee sets reminder → Stored in database → Scheduler checks every minute → 
Time matches → Notification sent (to be implemented)
```

## 📊 Statistics Tracked

- **Total Workouts**: Count of completed workouts
- **Total Duration**: Sum of all workout durations
- **Average Duration**: Mean workout duration
- **Workouts per Week**: Calculated frequency

## 🔔 Notification Implementation

Currently, reminders are logged in the backend. To implement actual notifications:

### Option 1: Push Notifications (Recommended)
```bash
npm install expo-notifications
```
Then update the scheduler to send push notifications.

### Option 2: Email Notifications
Use SendGrid, Mailgun, or SMTP.

### Option 3: SMS Notifications
Use Twilio or similar service.

## 🧪 Testing

Run the test suite:
```bash
cd backend
python test_workout_tracking.py
```

Or test manually:
1. Mark attendance as a trainee
2. Check if workout log was created
3. View statistics
4. Create a reminder
5. Wait for reminder to trigger (check logs)

## 🐛 Troubleshooting

### Workout logs not appearing?
- Check if attendance has `is_present=true`
- Verify backend logs for errors
- Ensure database tables exist

### Reminders not working?
- Verify scheduler is running (check startup logs)
- Check reminder is active (`is_active=true`)
- Ensure time format is correct (HH:MM:SS)

### Frontend not loading?
- Verify API_URL in components
- Check network requests in console
- Ensure backend is running

## 📈 Future Enhancements

### Planned Features
- [ ] Push notifications for reminders
- [ ] Workout streaks and achievements
- [ ] Progress charts and graphs
- [ ] Trainer dashboard for viewing trainee progress
- [ ] Workout challenges and competitions
- [ ] Social sharing of achievements
- [ ] Personal records tracking
- [ ] Workout intensity ratings

### Community Contributions
We welcome contributions! Areas for improvement:
- Enhanced statistics and analytics
- Better visualization of workout data
- Integration with fitness trackers
- Gamification features
- Social features

## 🤝 Support

### Getting Help
1. Check the documentation files
2. Review the implementation checklist
3. Check backend logs for errors
4. Test API endpoints using `/docs`

### Reporting Issues
When reporting issues, please include:
- Error messages from backend logs
- Frontend console errors
- Steps to reproduce
- Expected vs actual behavior

## 📝 Version History

### v1.0.0 (2026-01-26)
- ✅ Initial implementation
- ✅ Automatic workout tracking from attendance
- ✅ Workout statistics (30-day view)
- ✅ Customizable workout reminders
- ✅ Background scheduler for reminders
- ✅ Frontend components for trainees
- ✅ Complete API endpoints
- ✅ Comprehensive documentation

## 🙏 Credits

Built for WeaponFitness by the development team.

Special thanks to:
- FastAPI for the excellent backend framework
- React Native for the mobile framework
- APScheduler for reliable background jobs
- Supabase for database hosting

## 📄 License

This feature is part of the WeaponFitness application.

---

## 🎉 You're All Set!

Your workout tracking and reminder system is ready to use. Start by:

1. ✅ Creating the database tables
2. ✅ Starting the backend server
3. ✅ Integrating the frontend components
4. ✅ Testing with a trainee account

For detailed instructions, see **IMPLEMENTATION_SUMMARY.md**.

**Happy tracking! 💪**
