"""Demo-gym seed: believable data for every dashboard (run once).

Creates data-only profiles (no auth accounts — demo people never log in):
2 trainers, 1 receptionist, 18 members, 30 days of attendance, payments,
workout templates, 2 groups. The Owner + HQ branch must already exist.
"""
import os, random, uuid, datetime as dt
import psycopg2
from dotenv import load_dotenv

load_dotenv(".env")
random.seed(42)

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute("select id from branches limit 1")
BRANCH = cur.fetchone()[0]

def profile(name, role, phone=None):
    pid = str(uuid.uuid4())
    cur.execute(
        "insert into profiles (id, full_name, phone, role, branch_id) values (%s,%s,%s,%s,%s)",
        (pid, name, phone, role, BRANCH),
    )
    return pid

# --- staff ---
t1 = profile("Priya Kapoor", "Trainer", "+91 98200 11001")
t2 = profile("Rohan Iyer", "Trainer", "+91 98200 11002")
cur.execute("insert into trainers (id, experience_years, rating_avg, bio) values (%s,7,4.8,'Strength & conditioning. Ex-state powerlifting coach.')", (t1,))
cur.execute("insert into trainers (id, experience_years, rating_avg, bio) values (%s,4,4.6,'Functional fitness and mobility specialist.')", (t2,))
profile("Sneha Rao", "Receptionist", "+91 98200 11003")

# --- members ---
names = ["Arjun Mehta","Sahil Verma","Ananya Singh","Vikram Nair","Divya Pillai","Karthik Reddy",
         "Meera Joshi","Aditya Kulkarni","Pooja Sharma","Rahul Das","Nisha Patel","Imran Shaikh",
         "Tanvi Desai","Siddharth Roy","Lakshmi Menon","Farhan Khan","Ritika Bose","Dev Patel"]
trainee_ids = []
today = dt.date.today()
for i, name in enumerate(names):
    pid = profile(name, "Trainee", f"+91 98311 22{i:03d}")
    joined = today - dt.timedelta(days=random.randint(20, 180))
    cur.execute(
        "insert into trainees (id, trainer_id, weight, height, xp, level, created_at) values (%s,%s,%s,%s,%s,%s,%s)",
        (pid, t1 if i % 2 == 0 else t2, round(random.uniform(52, 95), 1),
         round(random.uniform(152, 188), 1), random.randint(0, 4200), random.randint(1, 9), joined),
    )
    trainee_ids.append((pid, joined))

# --- attendance: last 30 days, per-member habit strength ---
for pid, joined in trainee_ids:
    habit = random.uniform(0.35, 0.85)
    for d in range(30):
        day = today - dt.timedelta(days=d)
        if day < joined or day.weekday() == 6:  # gym shut Sundays
            continue
        if random.random() < habit:
            cur.execute(
                "insert into attendance (id, trainee_id, attendance_date, is_present) values (%s,%s,%s,true)",
                (str(uuid.uuid4()), pid, day),
            )

# --- payments: joining payment + some renewals this month ---
cur.execute("select id, plan_name, price, duration_months from membership_plans")
plans = cur.fetchall()
for pid, joined in trainee_ids:
    plan = random.choice(plans)
    cur.execute(
        "insert into payments (id, profile_id, amount, payment_mode, payment_status, created_at) values (%s,%s,%s,%s,'Completed',%s)",
        (str(uuid.uuid4()), pid, plan[2], random.choice(["UPI", "Cash", "Card"]), joined),
    )
    if random.random() < 0.5:
        renew = today - dt.timedelta(days=random.randint(0, min(27, today.day)))
        cur.execute(
            "insert into payments (id, profile_id, amount, payment_mode, payment_status, created_at) values (%s,%s,%s,%s,'Completed',%s)",
            (str(uuid.uuid4()), pid, plan[2], random.choice(["UPI", "Cash", "Card"]), renew),
        )

# --- workout templates (introspect optional columns once) ---
cur.execute("select column_name from information_schema.columns where table_name='workout_templates'")
wt_cols = {r[0] for r in cur.fetchall()}
tmpl = []
for name, creator, desc in (
    ("Push Day A", t1, "Chest, shoulders, triceps - 8 exercises"),
    ("Pull Day A", t1, "Back and biceps - 7 exercises"),
    ("Leg Day", t2, "Squat-focused lower body - 6 exercises"),
    ("Mobility & Core", t2, "Recovery, mobility drills, core circuit"),
):
    tid = str(uuid.uuid4())
    base = {"id": tid, "creator_id": creator, "name": name}
    if "description" in wt_cols: base["description"] = desc
    keys = ", ".join(base); ph = ", ".join(["%s"] * len(base))
    cur.execute(f"insert into workout_templates ({keys}) values ({ph})", list(base.values()))
    tmpl.append(tid)

# --- groups ---
cur.execute("select column_name from information_schema.columns where table_name='trainee_groups'")
g_cols = {r[0] for r in cur.fetchall()}
cur.execute("select column_name from information_schema.columns where table_name='trainee_group_members'")
m_cols = {r[0] for r in cur.fetchall()}
for gname, gtrainer, members in (
    ("Morning Strength", t1, trainee_ids[:8]),
    ("Evening Conditioning", t2, trainee_ids[8:16]),
):
    gid = str(uuid.uuid4())
    g = {"id": gid, "trainer_id": gtrainer}
    if "group_name" in g_cols: g["group_name"] = gname
    elif "name" in g_cols: g["name"] = gname
    keys = ", ".join(g); ph = ", ".join(["%s"] * len(g))
    cur.execute(f"insert into trainee_groups ({keys}) values ({ph})", list(g.values()))
    for pid, _ in members:
        m = {"group_id": gid, "trainee_id": pid}
        if "id" in m_cols: m["id"] = str(uuid.uuid4())
        keys = ", ".join(m); ph = ", ".join(["%s"] * len(m))
        cur.execute(f"insert into trainee_group_members ({keys}) values ({ph})", list(m.values()))

conn.commit()
cur.execute("select (select count(*) from profiles), (select count(*) from trainees), (select count(*) from attendance), (select count(*) from payments), (select count(*) from workout_templates), (select count(*) from trainee_groups)")
print("profiles, trainees, attendance, payments, templates, groups:", cur.fetchone())
conn.close()
