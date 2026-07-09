import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Redis } from "https://esm.sh/@upstash/redis"
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

// --------------------
// 1️⃣ Initialize Redis
// --------------------
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
})

// --------------------
// 2️⃣ Supabase Admin Client (JWT verification)
// --------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

// --------------------
// 3️⃣ Rate limit presets (Gym App)
// --------------------
const rateLimits: Record<string, Ratelimit> = {
  "/login": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
  }),
  "/otp": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "10 m"),
  }),
  "/signup": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
  }),
  "/attendance": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
  }),
  "/booking": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
  }),
  "/feedback": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, "10 m"),
  }),
  "/create_group": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
  }),
  "/create_diet": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
  }),
  "/create_workout": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
  }),
  "/assign_workout": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
  }),
  "/assign_diet": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
  }),
  "/admin_write": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
  }),
  "default": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
  }),
}

// --------------------
// 3b️⃣ Role-based access control (RBAC)
//     Every action string → roles allowed to perform it.
//     Roles: "Admin" | "Owner" | "Receptionist" | "Trainer" | "Trainee"
// --------------------
const ACTION_ROLES: Record<string, string[]> = {
  // Management (Owner / Admin only)
  add_branch: ["Admin", "Owner"],
  add_trainer: ["Admin", "Owner"],
  add_receptionist: ["Admin", "Owner"],
  manage_plans: ["Admin", "Owner"],
  // Member registration / renewal / attendance (front desk + management)
  create_trainee: ["Admin", "Owner", "Receptionist"],
  add_trainee: ["Admin", "Owner", "Receptionist"],
  renew_subscription: ["Admin", "Owner", "Receptionist"],
  admin_attendance: ["Admin", "Owner", "Receptionist"],
  // Training content + groups (trainers + management)
  create_group: ["Admin", "Owner", "Trainer"],
  delete_group: ["Admin", "Owner", "Trainer"],
  add_workout: ["Admin", "Owner", "Trainer"],
  create_diet_plan: ["Admin", "Owner", "Trainer"],
  assign_diet: ["Admin", "Owner", "Trainer"],
  assign_workout: ["Admin", "Owner", "Trainer"],
  // Self-service (trainee acting as themselves)
  submit_feedback: ["Trainee"],
}

const forbidden = (detail: string) =>
  new Response(
    JSON.stringify({ error: "forbidden", detail }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  )

console.log("✅ Secure Rate Limit Function Ready")

// --------------------
// 4️⃣ HTTP Server
// --------------------
serve(async (req: Request) => {
  try {
    // ---- CORS ----
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      })
    }

    // ---- Endpoint detection ----
    const url = new URL(req.url)
    // Check custom header first, fallback to url.pathname
    const customPath = req.headers.get("x-action-path")
    const path = customPath || url.pathname

    // Debug logging (optional, remove in prod if too noisy)
    console.log(`Checking limit for path: ${path}`)

    const limiter = rateLimits[path] ?? rateLimits["default"]

    // ---- Identity (JWT > IP fallback) ----
    const authHeader = req.headers.get("authorization")
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous"

    let identifier = `ip:${ip}`
    let authedUser: { id: string } | null = null

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "")
      const { data, error } = await supabase.auth.getUser(token)

      if (!error && data?.user) {
        authedUser = data.user
        identifier = `user:${data.user.id}`
      }
    }

    // ---- Rate limit check ----
    const { success, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      console.warn(`🛑 Rate limit exceeded for ${identifier} on ${path}`)
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retry_after: reset,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      )
    }

    // ---- Business logic ----
    const body = await req.json().catch(() => ({}))
    const { action, payload } = body

    // ---- Authorization (RBAC) ----
    //    Any privileged action requires a verified JWT AND an allowed role.
    //    The caller's role comes from their profiles row — never the payload.
    let callerRole: string | null = null

    if (action) {
      if (!authedUser) {
        return new Response(
          JSON.stringify({ error: "unauthorized", detail: "Valid authentication required" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        )
      }

      const { data: callerProfile, error: callerErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authedUser.id)
        .single()

      if (callerErr || !callerProfile?.role) {
        return forbidden("No profile found for caller")
      }

      callerRole = callerProfile.role

      // Object.hasOwn guard: payload action strings like "constructor" must
      // hit "Unknown action", not inherited Object.prototype members.
      const allowedRoles = Object.hasOwn(ACTION_ROLES, action) ? ACTION_ROLES[action] : undefined
      if (!allowedRoles) {
        return forbidden("Unknown action")
      }
      if (!allowedRoles.includes(callerRole)) {
        return forbidden("Role not permitted for this action")
      }
    }

    // 1. RATE LIMIT CHECK (Existing Logic reused)
    //    We check the limit for the detected path.
    //    For 'create_trainee', the client should send x-action-path: '/signup'

    // 2. ACTION HANDLING
    if (action === "create_trainee") {
      const { email, password, fullName, phone, branchId, trainerId, planId, paymentMode } = payload

      // A. Validate Inputs
      if (!email || !password || !fullName || !planId || !branchId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
      }

      // B. Fetch Plan Details (Securely on Server)
      const { data: planData, error: planFetchErr } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("id", planId)
        .single()

      if (planFetchErr || !planData) {
        return new Response(JSON.stringify({ error: "Invalid membership plan" }), { status: 400 })
      }

      // C. Create Auth User (Admin)
      const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Auto-confirm
      })

      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), { status: 400 })
      }

      const newUserId = userData.user.id

      // D. Insert Profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: "Trainee",
        branch_id: branchId
      })
      if (profileErr) throw profileErr

      // E. Insert Trainee
      const { error: traineeErr } = await supabase.from("trainees").insert({
        id: newUserId,
        trainer_id: trainerId || null
      })
      if (traineeErr) throw traineeErr

      // F. Insert Trainee Plan
      const startDate = new Date().toISOString().split("T")[0]
      const { data: tpData, error: tpErr } = await supabase.from("trainee_plan").insert({
        trainee_id: newUserId,
        plan_id: planId,
        plan_name: planData.plan_name,
        cost: planData.price,
        duration_months: planData.duration_months,
        start_date: startDate,
        active_status: true
      }).select().single()
      if (tpErr) throw tpErr

      // G. Insert Payment
      const { error: payErr } = await supabase.from("payments").insert({
        trainee_id: newUserId,
        plan_id: planId,
        trainee_plan_id: tpData.trainee_plan_id,
        amount: planData.price,
        payment_mode: paymentMode,
        status: "Completed",
        date: new Date().toISOString()
      })
      if (payErr) throw payErr

      return new Response(
        JSON.stringify({ success: true, message: "Trainee created successfully", userId: newUserId }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 3. ACTION: CREATE GROUP
    if (action === "create_group") {
      const { groupName, memberIds } = payload
      // Trainers act as themselves (id from verified JWT); Admin/Owner may target another trainer via payload.
      const trainerId = callerRole === "Trainer" ? authedUser!.id : payload.trainerId
      console.log(`🔨 Creating group: "${groupName}" for trainer: ${trainerId}`)
      console.log(`👥 Member IDs:`, memberIds)

      if (!groupName || !trainerId) {
        return new Response(JSON.stringify({ error: "Missing group name or trainer ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
      }

      // --- NEW AUTHORITY CHECK / FIX ---
      console.log(`🔍 Verifying authority for trainer: ${trainerId}`)

      // 1. Check Profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', trainerId)
        .single()

      if (pErr || !profile) {
        console.warn("⚠️ No profile found for this ID. Authority cannot be verified.")
      } else {
        // Only a Trainee may be auto-promoted to Trainer here. Anything else
        // (Owner/Admin/Receptionist) must never be silently demoted by a
        // payload-supplied trainerId — reject instead.
        if (profile.role === 'Trainee') {
          console.log(`⬆️ Promoting trainee ${trainerId} to 'Trainer' role for authority.`)
          await supabase.from('profiles').update({ role: 'Trainer' }).eq('id', trainerId)
        } else if (profile.role !== 'Trainer' && profile.role !== 'Admin') {
          return forbidden("Target user cannot lead a group with their current role")
        }

        // 2. Check Trainer Record (required for FK in trainee_groups)
        const { data: trainerRecord } = await supabase
          .from('trainers')
          .select('id')
          .eq('id', trainerId)
          .single()

        if (!trainerRecord) {
          console.log(`🔨 Creating missing trainer record for ${trainerId}`)
          await supabase.from('trainers').insert({
            id: trainerId,
            experience_years: 1,
            bio: 'Certified Trainer'
          })
        }
      }
      // --- END AUTHORITY CHECK ---

      // A. Create Group
      const { data: groupData, error: groupErr } = await supabase
        .from("trainee_groups")
        .insert([{ group_name: groupName, trainer_id: trainerId }])
        .select()
        .single()

      if (groupErr) {
        console.error("❌ Group creation error:", groupErr)
        throw groupErr
      }

      console.log("✅ Group record created:", groupData.id)

      // B. Add Members
      if (memberIds && memberIds.length > 0) {
        console.log(`➕ Adding ${memberIds.length} members to group...`)
        const membersPayload = memberIds.map((id: string) => ({
          group_id: groupData.id,
          trainee_id: id,
        }))

        const { error: membersErr } = await supabase
          .from("trainee_group_members")
          .insert(membersPayload)

        if (membersErr) {
          console.error("❌ Member insertion error:", membersErr)
          throw membersErr
        }
        console.log("✅ Members added successfully")
      }

      return new Response(
        JSON.stringify({ success: true, message: "Group created successfully", groupId: groupData.id }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 4. ACTION: ADD BRANCH
    if (action === "add_branch") {
      const { branchName, address, contact, ownerId } = payload

      if (!branchName || !ownerId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
      }

      const { data: branchData, error: branchErr } = await supabase
        .from("branches")
        .insert({
          branch_name: branchName,
          address,
          owner_id: ownerId,
          contact_number: contact,
        })
        .select()
        .single()

      if (branchErr) throw branchErr

      return new Response(
        JSON.stringify({ success: true, message: "Branch created successfully", branchId: branchData.id }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 5. ACTION: ADD TRAINER
    if (action === "add_trainer") {
      const { email, password, fullName, phone, experience, branchId } = payload

      if (!email || !fullName || !branchId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
      }

      // A. Create User — a password is REQUIRED; no fallback. A stale client
      // omitting it must fail loudly, never get a guessable default.
      if (!password || typeof password !== "string" || password.length < 8) {
        return new Response(
          JSON.stringify({ error: "A password of at least 8 characters is required" }),
          { status: 400 }
        )
      }
      const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), { status: 400 })
      }
      const newUserId = userData.user.id

      // B. Insert Profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: "Trainer",
        branch_id: branchId
      })
      if (profileErr) throw profileErr

      // C. Insert Trainer
      const { error: trainerErr } = await supabase.from("trainers").insert({
        id: newUserId,
        experience_years: Number(experience) || 0,
        rating_avg: 0,
        bio: "New Trainer"
      })
      if (trainerErr) throw trainerErr

      return new Response(
        JSON.stringify({ success: true, message: "Trainer created successfully", userId: newUserId }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 6. ACTION: ADD RECEPTIONIST
    if (action === "add_receptionist") {
      const { email, password, fullName, phone, branchId } = payload

      if (!email || !password || !fullName || !branchId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      // A. Create User
      const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), { status: 400 })
      }
      const newUserId = userData.user.id

      // B. Insert Profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: "Receptionist",
        branch_id: branchId
      })
      if (profileErr) throw profileErr

      return new Response(
        JSON.stringify({ success: true, message: "Receptionist created successfully", userId: newUserId }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 7. ACTION: ADD WORKOUT
    if (action === "add_workout") {
      const { name, video_url, image_url, instructions } = payload
      // Actor identity comes from the verified JWT, not the payload
      const creator_id = authedUser!.id

      if (!name) {
        return new Response(JSON.stringify({ error: "Missing name" }), { status: 400 })
      }

      // Fetch branch_id from profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", creator_id)
        .single();

      const branchId = profileData?.branch_id || null

      const { data: workoutData, error: workoutErr } = await supabase.from("workout_templates").insert({
        name,
        video_url: video_url || null,
        image_url: image_url || null,
        instructions,
        creator_id,
        branch_id: branchId,
      }).select().single()

      if (workoutErr) throw workoutErr

      return new Response(
        JSON.stringify({ success: true, message: "Workout created successfully", workoutId: workoutData.id }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 8. ACTION: MANAGE PLANS (Create/Update/Delete)
    if (action === "manage_plans") {
      const { mode, planData, planId } = payload

      if (!mode) {
        return new Response(JSON.stringify({ error: "Missing mode" }), { status: 400 })
      }

      if (mode === "create") {
        const { error } = await supabase.from("membership_plans").insert(planData);
        if (error) throw error;
      } else if (mode === "update") {
        if (!planId) return new Response(JSON.stringify({ error: "Missing planId for update" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
        const { error } = await supabase.from("membership_plans").update(planData).eq("id", planId);
        if (error) throw error;
      } else if (mode === "delete") {
        if (!planId) return new Response(JSON.stringify({ error: "Missing planId for delete" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
        const { error } = await supabase.from("membership_plans").delete().eq("id", planId);
        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "Invalid mode" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        })
      }

      return new Response(
        JSON.stringify({ success: true, message: `Plan ${mode}d successfully` }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 9. ACTION: CREATE DIET PLAN
    if (action === "create_diet_plan") {
      const { dietName, meals } = payload

      if (!dietName || !meals || !Array.isArray(meals)) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
      }

      // 1. Create Diet Library Entry (creator derived from verified JWT, not payload)
      const { data: dietRow, error: dietErr } = await supabase
        .from("diet_library")
        .insert({
          name: dietName.trim(),
          created_by: authedUser!.id,
        })
        .select()
        .single();

      if (dietErr) throw dietErr

      const dietId = dietRow.id

      // 2. Insert meals and items
      for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];

        const { data: mealRow, error: mealErr } = await supabase
          .from("diet_meals")
          .insert({
            diet_id: dietId,
            meal_name: meal.mealName,
            order_index: i + 1,
          })
          .select()
          .single();

        if (mealErr) console.log("Error inserting meal:", mealErr)
        if (!mealRow) continue;

        if (meal.items && meal.items.length > 0) {
          const itemsPayload = meal.items.map((item: any, j: number) => ({
            meal_id: mealRow.id,
            item_name: item.name,
            quantity: item.qty,
            time_slot: item.time ? `${item.time}:00` : null,
            order_index: j + 1
          }))

          const { error: itemsErr } = await supabase.from("diet_items").insert(itemsPayload)
          if (itemsErr) console.log("Error inserting items:", itemsErr)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Diet Template Created" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // 10. ACTION: ASSIGN DIET
    if (action === "assign_diet") {
      const { mode, targetId, dayName, dietId } = payload

      if (!mode || !targetId || !dayName) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      if (mode === "group") {
        // Clear existing
        const { error: delErr } = await supabase
          .from("group_weekly_diet")
          .delete()
          .eq("group_id", targetId)
          .eq("day_name", dayName);
        if (delErr) throw delErr

        // Insert new if dietId present
        if (dietId) {
          const { error: insErr } = await supabase.from("group_weekly_diet").insert({
            group_id: targetId,
            day_name: dayName,
            diet_id: dietId
          })
          if (insErr) throw insErr
        }
      } else {
        // Personal
        const { error: delErr } = await supabase
          .from("custom_trainee_diet")
          .delete()
          .eq("trainee_id", targetId)
          .eq("day_name", dayName);
        if (delErr) throw delErr

        if (dietId) {
          const { error: insErr } = await supabase.from("custom_trainee_diet").insert({
            trainee_id: targetId,
            day_name: dayName,
            diet_id: dietId
          })
          if (insErr) throw insErr
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Diet Assigned" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 11. ACTION: ASSIGN WORKOUT
    if (action === "assign_workout") {
      const { mode, targetId, dayName, workoutIds } = payload

      if (!mode || !targetId || !dayName || !Array.isArray(workoutIds)) {
        return new Response(JSON.stringify({ error: "Missing required fields or invalid format" }), { status: 400 })
      }

      const table = mode === "group" ? "group_weekly_workouts" : "custom_trainee_weekly_workouts"
      const targetCol = mode === "group" ? "group_id" : "trainee_id"

      // 1. Delete existing for that day
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .eq(targetCol, targetId)
        .eq("day_name", dayName)

      if (delErr) throw delErr

      // 2. Insert new
      if (workoutIds.length > 0) {
        const insertPayload = workoutIds.map((tid: string) => ({
          [targetCol]: targetId,
          day_name: dayName,
          workout_template_id: tid
        }))

        const { error: insErr } = await supabase.from(table).insert(insertPayload)
        if (insErr) throw insErr
      }

      return new Response(
        JSON.stringify({ success: true, message: "Workouts Assigned" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 12. ACTION: ADD TRAINEE (Comprehensive Register)
    if (action === "add_trainee") {
      const { email, password, fullName, phone, trainerId, planId, paymentMode } = payload

      if (!email || !password || !fullName || !trainerId || !planId || !paymentMode) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      // A. Create User
      const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
        email,
        password, // Client provides password or default? Client provided.
        email_confirm: true
      })
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), { status: 400 })
      }
      const newUserId = userData.user.id

      // B. Insert Profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: "Trainee"
      })
      if (profileErr) throw profileErr

      // C. Insert Trainee
      const startDate = new Date().toISOString().split("T")[0]
      const { error: traineeErr } = await supabase.from("trainees").insert({
        id: newUserId, // references profiles.id
        trainer_id: trainerId,
        start_date: startDate
      })
      if (traineeErr) throw traineeErr

      // D. Fetch Plan Details (Securely)
      const { data: planData, error: planFetchErr } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("id", planId)
        .single()

      if (planFetchErr || !planData) return new Response(JSON.stringify({ error: "Invalid Plan ID" }), { status: 400 })

      // E. Calculate Expiry
      const startObj = new Date(startDate)
      startObj.setMonth(startObj.getMonth() + planData.duration_months)
      const expiryDate = startObj.toISOString().split("T")[0]

      // F. Insert Trainee Plan
      const { data: tpData, error: tpErr } = await supabase.from("trainee_plan").insert({
        trainee_id: newUserId,
        plan_id: planId,
        plan_name: planData.plan_name,
        cost: planData.price,
        duration_months: planData.duration_months,
        start_date: startDate,
        expiry_date: expiryDate,
        active_status: true
      }).select().single()

      if (tpErr) throw tpErr

      // G. Insert Payment
      const { error: payErr } = await supabase.from("payments").insert({
        trainee_id: newUserId,
        plan_id: planId,
        trainee_plan_id: tpData.trainee_plan_id, // needs to be returned from F
        amount: planData.price,
        payment_mode: paymentMode,
        status: "COMPLETED",
        date: new Date().toISOString()
      })
      if (payErr) throw payErr

      return new Response(
        JSON.stringify({ success: true, message: "Trainee Registered Successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // 13. ACTION: RENEW SUBSCRIPTION
    if (action === "renew_subscription") {
      const { traineeId, planId, paymentMode } = payload

      if (!traineeId || !planId || !paymentMode) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      // 1. Verify and Deactivate active plan (if any)
      // Check if there is an *active* plan that hasn't expired yet? 
      // The client check: "active_status = true AND expiry_date >= today"
      // If found, client blocks.
      // We can also block or just deactivate it (upgrade/renewal).
      // Let's mimic client logic: block if active not expired, ELSE deactivate old active ones.

      const today = new Date().toISOString().split('T')[0]
      const { data: activePlans } = await supabase
        .from("trainee_plan")
        .select("trainee_plan_id")
        .eq("trainee_id", traineeId)
        .eq("active_status", true)
        .gte("expiry_date", today)
        .limit(1)

      if (activePlans && activePlans.length > 0) {
        return new Response(JSON.stringify({ error: "Renewal failed: Active subscription already exists." }), { status: 400 })
      }

      // Deactivate any old "active" plans (maybe expired ones still marked active)
      await supabase
        .from("trainee_plan")
        .update({ active_status: false })
        .eq("trainee_id", traineeId)
        .eq("active_status", true)

      // 2. Fetch Plan
      const { data: planData, error: planErr } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("id", planId)
        .single()

      if (planErr || !planData) return new Response(JSON.stringify({ error: "Invalid Plan ID" }), { status: 400 })

      // 3. Calculate Expiry
      const startDate = new Date().toISOString().split("T")[0]
      const startObj = new Date(startDate)
      startObj.setMonth(startObj.getMonth() + planData.duration_months)
      const expiryDate = startObj.toISOString().split("T")[0]

      // 4. Insert New Plan
      const { data: newPlan, error: newPlanErr } = await supabase
        .from("trainee_plan")
        .insert({
          trainee_id: traineeId,
          plan_id: planId,
          plan_name: planData.plan_name,
          cost: planData.price,
          duration_months: planData.duration_months,
          start_date: startDate,
          expiry_date: expiryDate,
          active_status: true
        })
        .select()
        .single()

      if (newPlanErr) throw newPlanErr

      // 5. Insert Payment
      const { error: payErr } = await supabase
        .from("payments")
        .insert({
          trainee_id: traineeId,
          plan_id: planId,
          trainee_plan_id: newPlan.trainee_plan_id,
          amount: planData.price,
          payment_mode: paymentMode,
          status: "COMPLETED",
          date: new Date().toISOString()
        })

      if (payErr) throw payErr

      return new Response(
        JSON.stringify({ success: true, message: "Subscription renewed successfully!" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // 14. ACTION: ADMIN MARK ATTENDANCE
    if (action === "admin_attendance") {
      const { traineeId, branchId } = payload

      if (!traineeId || !branchId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      const today = new Date().toISOString().split("T")[0]

      // Check duplicate
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("trainee_id", traineeId)
        .eq("date", today)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: "Already checked in today" }), { status: 400 })
      }

      const { error: attErr } = await supabase.from("attendance").insert({
        trainee_id: traineeId,
        branch_id: branchId,
        date: today,
        time_in: new Date().toLocaleTimeString("en-IN"), // Server time is UTC, maybe use client time passed in? 
        // Edge function runs in Deno which is usually UTC. 
        // For simplicity, let's just use string ISO or client provided? 
        // Code used: new Date().toLocaleTimeString("en-IN") in client (which is correct local). 
        // Server might produce different time string. 
        // Let's accept time buffer or just use simple string. 
        // Better: let server generate it or use standard ISO. 
        // For now, I'll stick to a simple UTC string or specific locale if supported.
        qr_code_id: "RECEPTION_DESK"
      })
      if (attErr) throw attErr

      return new Response(
        JSON.stringify({ success: true, message: "Attendance Marked" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // 15. ACTION: SUBMIT FEEDBACK
    if (action === "submit_feedback") {
      const { trainerId, rating, comment } = payload

      // Actor identity is derived from the verified JWT — never from the payload.
      const traineeId = authedUser!.id

      if (!trainerId || !rating) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
      }

      const { error: fbErr } = await supabase.from("feedback").insert({
        trainee_id: traineeId,
        trainer_id: trainerId,
        rating,
        comment
      })
      if (fbErr) throw fbErr

      return new Response(
        JSON.stringify({ success: true, message: "Feedback Submitted" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // 16. ACTION: DELETE GROUP
    if (action === "delete_group") {
      const { groupId } = payload

      if (!groupId) {
        return new Response(JSON.stringify({ error: "Missing groupId" }), { status: 400 })
      }

      // Trainers may only delete their own groups; Admin/Owner may delete any.
      if (callerRole === "Trainer") {
        const { data: groupRow } = await supabase
          .from("trainee_groups")
          .select("trainer_id")
          .eq("id", groupId)
          .single()

        if (!groupRow || groupRow.trainer_id !== authedUser!.id) {
          return forbidden("You can only delete your own groups")
        }
      }

      // 1. Delete members first
      const { error: memberErr } = await supabase
        .from("trainee_group_members")
        .delete()
        .eq("group_id", groupId)

      if (memberErr) throw memberErr

      // 2. Delete group
      const { error: groupErr } = await supabase
        .from("trainee_groups")
        .delete()
        .eq("id", groupId)

      if (groupErr) throw groupErr

      return new Response(
        JSON.stringify({ success: true, message: "Group Deleted" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        remaining,
        data: body,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  } catch (err) {
    console.error("🔥 Global Error Handler:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  }
})