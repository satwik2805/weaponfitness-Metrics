-- SQL script to create a trainee profile for trainee@gmail.com
-- Run this in your Supabase SQL Editor

-- First, get the user_id from auth.users
DO $$
DECLARE
    v_user_id UUID;
    v_trainee_id INTEGER;
BEGIN
    -- Get the user_id for trainee@gmail.com
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'trainee@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User with email trainee@gmail.com not found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user_id: %', v_user_id;
    
    -- Check if trainee already exists
    SELECT id INTO v_trainee_id
    FROM trainees
    WHERE user_id = v_user_id;
    
    IF v_trainee_id IS NOT NULL THEN
        RAISE NOTICE 'Trainee profile already exists with ID: %', v_trainee_id;
        RETURN;
    END IF;
    
    -- Create trainee record
    INSERT INTO trainees (user_id, full_name, email)
    VALUES (v_user_id, 'Test Trainee', 'trainee@gmail.com')
    RETURNING id INTO v_trainee_id;
    
    RAISE NOTICE 'Created trainee profile with ID: %', v_trainee_id;
    
    -- Also create a profile record if it doesn't exist
    INSERT INTO profiles (id, full_name, email, role)
    VALUES (v_user_id, 'Test Trainee', 'trainee@gmail.com', 'trainee')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role;
    
    RAISE NOTICE 'Profile record created/updated';
END $$;
