# AnatoMuscle - Interactive Muscle Selection Dashboard

This dashboard provides a premium interactive muscle selection panel, mapping out both major and minor muscle groups (including deep stabilizers and shin/calf variations), with live Supabase synchronization (and a local storage fallback).

## File Structure
- **[index.html](file:///C:/Users/uppal/workspace/weaponfitness/supabase/index.html)**: Interactive visual mapping of muscle paths (Anatomy Map silhouette) using SVG. Contains general CSS variables and dark-cyber theme styling.
- **[js/app.js](file:///C:/Users/uppal/workspace/weaponfitness/supabase/js/app.js)**: Controller logic for checkboxes, dynamic exercise filtering, and database synchronization.
- **[config/supabase.js](file:///C:/Users/uppal/workspace/weaponfitness/supabase/config/supabase.js)**: Connection configuration. You can edit this file directly or use the **Configure Supabase** settings modal in the web app UI to dynamically save/connect to your database.
- **[supabase_schema.sql](file:///C:/Users/uppal/workspace/weaponfitness/supabase/supabase_schema.sql)**: SQL table setup parameters.

## Setup Instructions

### 1. Database Creation
Go to your **Supabase Dashboard**, open the **SQL Editor**, and run the code from `supabase_schema.sql` to initialize your database tables and row-level policies.

### 2. Client Connection
Click the **Configure Supabase** button in the header of `index.html`, paste in your Project URL and anon public key, and select **Save & Connect**. The dashboard will reconnect and switch from **Demo Mode** to **Cloud Synced** automatically.
