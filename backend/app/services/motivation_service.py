# app/services/motivation_service.py
import random

MOTIVATION_QUOTES = [
    "Sweat is just fat crying! Keep going! ",
    "Your future self will thank you for today's workout. ",
    "Don't stop when you're tired, stop when you're done! ",
    "The only bad workout is the one that didn't happen. ",
    "Everything is hard before it is easy. You got this! ",
    "Success starts with self-discipline. Let's move! ",
    "You're only one workout away from a good mood. ",
    "Investing in yourself is the best investment you'll ever make. ",
    "Action is the foundational key to all success. ",
    "Be stronger than your excuses. ",
    "Work hard in silence, let your success be your noise. ",
    "Discipline is doing what needs to be done, even if you don't want to. ",
    "Consistency is the key. Show up for yourself today! ",
    "Small progress is still progress. Keep pushing! ",
    "Eat clean, train mean, get lean! ",
    "Your health is your wealth. Take care of it today! ",
    "Believe in yourself and you're halfway there. ",
    "Focus on your goal, don't look in any direction but ahead. ",
    "The pain you feel today will be the strength you feel tomorrow. ",
    "Make yourself your priority. It's not selfish, it's necessary. "
]

SWIGGY_STYLE_QUOTES = [
    "Knock knock! Who's there? Your gains. Gains who? Gains you're about to make today! ",
    "Calories are like that one relative who overstays their welcome. Time to evict them! ",
    "Your gym shoes called... they're feeling a bit lonely. ",
    "Did you know? A 30-minute workout is just 2% of your day. Treat yourself! ",
    "You're like a fine wine, but instead of aging, you're just getting buff! ",
    "If you can wait 20 mins for a delivery, you can give 20 mins to your muscles. ",
    "Legend says if you skip today, your dumbbells will miss you. Don't be heartless! ",
    "Success is 10% sweat and 90% showing up when you'd rather be napping. ",
    "Think of a workout as a 'delivery' for your health. No tip required! ",
    "You've got the power! No, seriously, go lift something heavy. ",
    "Workout loading...  (Almost there, just need you!) ",
    "Dear Trainee, your muscles are requesting a meeting in the weight room. ",
    "Don't let your gym membership be a 'donation' this month. Go get your money's worth! ",
    "Your future self just sent a 'Thank You' note. It's waiting for you at the finish line! ",
    "Stressing about it won't burn calories. But squats will! ",
    "Imagine your fat is a cloud and your workout is a leaf blower. ",
    "You're doing great! Even if you only did one rep, that's one more than those on the couch. ",
    "Fitness isn't a destination, it's a 'subscription' you renew daily! ",
    "Hungry for progress? Order a workout now! ",
    "Your body is a temple, but even temples need a little renovation sometimes. "
]

CUTE_GREETINGS = [
    "Hey Champion! ",
    "Time to shine! ",
    "Ready to smash it? ",
    "Let's get those gains! ",
    "Move your body, fuel your soul! ",
    "Hello Sunshine! ",
    "Rise and grind! ",
    "You're doing amazing! ",
    "Hey Rockstar! ",
    "Ready for takeoff? ",
    "Look who's back! ",
    "Your vibe is everything! "
]

def get_random_quote(style="mixed"):
    if style == "swiggy":
        return random.choice(SWIGGY_STYLE_QUOTES)
    elif style == "classic":
        return random.choice(MOTIVATION_QUOTES)
    else:
        # 70% Swiggy style, 30% classic for variety
        return random.choice(SWIGGY_STYLE_QUOTES if random.random() < 0.7 else MOTIVATION_QUOTES)

def get_random_greeting():
    return random.choice(CUTE_GREETINGS)

def get_combined_motivation():
    return f"{get_random_greeting()} {get_random_quote()}"

