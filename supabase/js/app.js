// js/app.js
import { supabase, isDemo, credentials } from '../config/supabase.js';

// Comprehensive muscle database mapping major regions to minor muscles
export const muscleDatabase = {
  chest: {
    name: "Chest",
    region: "anterior",
    minorMuscles: {
      pectoralisMajor: { name: "Pectoralis Major", desc: "Large chest muscle responsible for horizontal adduction and internal rotation of the arm.", type: "Major" },
      pectoralisMinor: { name: "Pectoralis Minor", desc: "Thin triangular muscle beneath the major; stabilizes and pulls down the scapula.", type: "Minor" },
      serratusAnterior: { name: "Serratus Anterior", desc: "Wings along the ribs; crucial for scapula protraction (the 'boxer's muscle').", type: "Minor" }
    }
  },
  back: {
    name: "Back",
    region: "posterior",
    minorMuscles: {
      latissimusDorsi: { name: "Latissimus Dorsi", desc: "Broadest muscle of the back; responsible for extension, adduction, and pulling motions.", type: "Major" },
      rhomboids: { name: "Rhomboids (Major & Minor)", desc: "Located between shoulder blades; retracts and stabilizes the scapula.", type: "Minor" },
      trapeziusUpper: { name: "Upper Trapezius", desc: "Supports neck and elevates shoulders (shrugging motion).", type: "Major" },
      trapeziusLower: { name: "Lower Trapezius", desc: "Helps pull the shoulder blades down and back (scapular depression).", type: "Minor" },
      erectorSpinae: { name: "Erector Spinae", desc: "Lower back stabilizers running along the spine; crucial for posture and spine extension.", type: "Major" },
      teresMajor: { name: "Teres Major", desc: "Assists the latissimus dorsi in drawing the arm backward and downward.", type: "Minor" }
    }
  },
  shoulders: {
    name: "Shoulders",
    region: "anterior", // Deltoids span both, placed anteriorly for ease
    minorMuscles: {
      anteriorDeltoid: { name: "Anterior Deltoid", desc: "Front shoulder muscle involved in shoulder flexion (lifting arm forward).", type: "Major" },
      lateralDeltoid: { name: "Lateral Deltoid", desc: "Side shoulder muscle responsible for shoulder abduction (lifting arm to the side).", type: "Major" },
      posteriorDeltoid: { name: "Posterior Deltoid", desc: "Rear shoulder muscle; pulls the arm backward (horizontal abduction).", type: "Minor" },
      rotatorCuff: { name: "Rotator Cuff", desc: "Group of four small stabilizing muscles (supraspinatus, infraspinatus, teres minor, subscapularis) protecting the shoulder joint.", type: "Minor" }
    }
  },
  arms: {
    name: "Arms",
    region: "anterior",
    minorMuscles: {
      bicepsBrachii: { name: "Biceps Brachii", desc: "Two-headed muscle on front of upper arm; flexes and supinates the forearm.", type: "Major" },
      brachialis: { name: "Brachialis", desc: "Lies deeper than the biceps; strongest flexor of the elbow joint.", type: "Minor" },
      tricepsBrachii: { name: "Triceps Brachii", desc: "Three-headed muscle on back of upper arm; primary elbow extensor.", type: "Major" },
      brachioradialis: { name: "Brachioradialis", desc: "Forearm muscle that flexes elbow, especially in a neutral/hammer grip.", type: "Minor" },
      pronatorTeres: { name: "Pronator Teres", desc: "Located on forearm; rotates forearm inward (pronation) and assists elbow flexion.", type: "Minor" }
    }
  },
  core: {
    name: "Core",
    region: "anterior",
    minorMuscles: {
      rectusAbdominis: { name: "Rectus Abdominis", desc: "The 'six-pack' muscle; flexes the spine forward.", type: "Major" },
      obliques: { name: "Obliques (Internal & External)", desc: "Sides of abdomen; responsible for spine rotation and lateral bending.", type: "Major" },
      transversusAbdominis: { name: "Transversus Abdominis", desc: "Deepest core muscle acting as a corset; stabilizes the lower back and pelvis.", type: "Minor" }
    }
  },
  legs: {
    name: "Legs",
    region: "anterior",
    minorMuscles: {
      quadriceps: { name: "Quadriceps Femoris", desc: "Four muscles on front of thigh; primary knee extensors.", type: "Major" },
      hamstrings: { name: "Hamstrings", desc: "Three muscles on back of thigh; flexes the knee and extends the hips.", type: "Major" },
      gluteusMaximus: { name: "Gluteus Maximus", desc: "Largest buttock muscle; primary hip extensor and stabilizer.", type: "Major" },
      gastrocnemius: { name: "Gastrocnemius (Calves)", desc: "Double-headed outer calf muscle; handles plantar flexion (pointing toes).", type: "Major" },
      soleus: { name: "Soleus (Calves)", desc: "Flat, deeper calf muscle beneath gastrocnemius; crucial for walking and endurance.", type: "Minor" },
      tibialisAnterior: { name: "Tibialis Anterior", desc: "Located on front of shin; lifts the foot toward the shin (dorsiflexion).", type: "Minor" },
      adductors: { name: "Hip Adductors", desc: "Inner thigh muscles; draws the leg inward toward the body's midline.", type: "Minor" }
    }
  }
};

// Rich lookup database of exercises mapped to primary and secondary minor muscles
export const exerciseDatabase = [
  {
    name: "Barbell Bench Press",
    primary: "pectoralisMajor",
    secondary: ["anteriorDeltoid", "tricepsBrachii"],
    desc: "Classic compound exercise focusing on chest thickness and pressing power.",
    difficulty: "Beginner",
    category: "Strength",
    equipment: "Barbell, Bench"
  },
  {
    name: "Incline Dumbbell Fly",
    primary: "pectoralisMinor",
    secondary: ["pectoralisMajor", "anteriorDeltoid"],
    desc: "Great isolation movement emphasizing chest stretch and scapular stabilization.",
    difficulty: "Intermediate",
    category: "Hypertrophy",
    equipment: "Dumbbells, Incline Bench"
  },
  {
    name: "Dumbbell Pullover",
    primary: "serratusAnterior",
    secondary: ["latissimusDorsi", "pectoralisMajor"],
    desc: "Expands the rib cage while strengthening the serratus anterior and upper lats.",
    difficulty: "Intermediate",
    category: "Hypertrophy",
    equipment: "Dumbbell, Bench"
  },
  {
    name: "Pull-Ups / Lat Pulldown",
    primary: "latissimusDorsi",
    secondary: ["bicepsBrachii", "rhomboids", "teresMajor"],
    desc: "Essential pulling exercise to build width in the upper and mid back.",
    difficulty: "Intermediate",
    category: "Strength",
    equipment: "Pullup Bar / Pulldown Machine"
  },
  {
    name: "Chest Supported Row",
    primary: "rhomboids",
    secondary: ["latissimusDorsi", "bicepsBrachii", "trapeziusLower"],
    desc: "Isolates the upper back muscles while eliminating lower back momentum.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Dumbbells, Bench"
  },
  {
    name: "Face Pulls",
    primary: "posteriorDeltoid",
    secondary: ["rotatorCuff", "trapeziusUpper", "rhomboids"],
    desc: "Excellent for shoulder health, posture, and targeting rear delts.",
    difficulty: "Beginner",
    category: "Rehab/Hypertrophy",
    equipment: "Cable Machine / Resistance Band"
  },
  {
    name: "Overhead Dumbbell Press",
    primary: "anteriorDeltoid",
    secondary: ["lateralDeltoid", "tricepsBrachii"],
    desc: "Builds vertical pressing strength and shoulder mass.",
    difficulty: "Beginner",
    category: "Strength",
    equipment: "Dumbbells"
  },
  {
    name: "Lateral Raises",
    primary: "lateralDeltoid",
    secondary: ["anteriorDeltoid", "trapeziusUpper"],
    desc: "Isolates the side delts to create shoulder width and '3D' caps.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Dumbbells / Cables"
  },
  {
    name: "Incline Dumbbell Curl",
    primary: "bicepsBrachii",
    secondary: ["brachialis", "brachioradialis"],
    desc: "Places biceps in a maximum stretch position, emphasizing the long head.",
    difficulty: "Intermediate",
    category: "Hypertrophy",
    equipment: "Dumbbells, Incline Bench"
  },
  {
    name: "Hammer Curl",
    primary: "brachioradialis",
    secondary: ["bicepsBrachii", "brachialis"],
    desc: "Neutral grip curl targeting the forearm and lateral upper arm muscles.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Dumbbells"
  },
  {
    name: "Tricep Overhead Extension",
    primary: "tricepsBrachii",
    secondary: ["pronatorTeres"],
    desc: "Emphasizes the long head of the triceps by extending overhead.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Dumbbell / Cable"
  },
  {
    name: "Plank with Shoulder Taps",
    primary: "transversusAbdominis",
    secondary: ["rectusAbdominis", "obliques", "rotatorCuff"],
    desc: "Deep stabilizing core movement that challenges anti-rotation.",
    difficulty: "Intermediate",
    category: "Stability",
    equipment: "Bodyweight"
  },
  {
    name: "Hanging Leg Raises",
    primary: "rectusAbdominis",
    secondary: ["obliques", "adductors"],
    desc: "Advanced core movement targeting lower abdominal fibers and hip flexors.",
    difficulty: "Advanced",
    category: "Strength",
    equipment: "Pullup Bar"
  },
  {
    name: "Barbell Back Squat",
    primary: "quadriceps",
    secondary: ["gluteusMaximus", "adductors", "erectorSpinae"],
    desc: "The king of lower body movements, targeting overall leg power.",
    difficulty: "Intermediate",
    category: "Strength",
    equipment: "Barbell, Squat Rack"
  },
  {
    name: "Romanian Deadlift",
    primary: "hamstrings",
    secondary: ["gluteusMaximus", "erectorSpinae", "soleus"],
    desc: "Hinge movement focusing on the posterior chain muscles (glutes and hamstrings).",
    difficulty: "Intermediate",
    category: "Strength",
    equipment: "Barbell / Dumbbells"
  },
  {
    name: "Standing Calf Raise",
    primary: "gastrocnemius",
    secondary: ["soleus"],
    desc: "Targets the diamond-shaped outer calf muscle with straight legs.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Calf Machine / Dumbbell"
  },
  {
    name: "Seated Calf Raise",
    primary: "soleus",
    secondary: ["gastrocnemius"],
    desc: "Bending the knee de-emphasizes the gastrocnemius, isolating the soleus.",
    difficulty: "Beginner",
    category: "Hypertrophy",
    equipment: "Seated Calf Machine / Plate on Knees"
  },
  {
    name: "Tibialis Raises",
    primary: "tibialisAnterior",
    secondary: ["soleus"],
    desc: "Flexes shin muscles to improve ankle mobility and protect knee joints.",
    difficulty: "Beginner",
    category: "Mobility",
    equipment: "Wall / Tib Bar"
  },
  {
    name: "Lying Cable Rotations",
    primary: "rotatorCuff",
    secondary: ["posteriorDeltoid"],
    desc: "Isolates external rotators to stabilize shoulder socket.",
    difficulty: "Beginner",
    category: "Rehab/Mobility",
    equipment: "Cable / Resistance Band"
  },
  {
    name: "Copenhagen Plank",
    primary: "adductors",
    secondary: ["obliques", "transversusAbdominis"],
    desc: "Side-plank variant focusing heavily on inner thigh adductor strengthening.",
    difficulty: "Advanced",
    category: "Stability",
    equipment: "Bench"
  }
];

// App State Management
class AppState {
  constructor() {
    this.selectedMuscles = new Set(); // Stores minor muscle keys (e.g. 'pectoralisMajor')
    this.connectionStatus = 'Disconnected';
    this.isDemoMode = isDemo;
  }

  // Add or remove a minor muscle
  toggleMuscle(muscleKey) {
    if (this.selectedMuscles.has(muscleKey)) {
      this.selectedMuscles.delete(muscleKey);
    } else {
      this.selectedMuscles.add(muscleKey);
    }
    this.triggerSync();
  }

  // Clear all selections
  clearAll() {
    this.selectedMuscles.clear();
    this.triggerSync();
  }

  // Check if a muscle is selected
  isMuscleSelected(muscleKey) {
    return this.selectedMuscles.has(muscleKey);
  }

  // Check if an entire major group has any selections
  isMajorGroupActive(groupKey) {
    const group = muscleDatabase[groupKey];
    if (!group) return false;
    return Object.keys(group.minorMuscles).some(minorKey => this.selectedMuscles.has(minorKey));
  }

  // Check if all minor muscles under a major group are selected
  isMajorGroupFullySelected(groupKey) {
    const group = muscleDatabase[groupKey];
    if (!group) return false;
    return Object.keys(group.minorMuscles).every(minorKey => this.selectedMuscles.has(minorKey));
  }

  // Toggle all minor muscles in a major group
  toggleMajorGroup(groupKey) {
    const group = muscleDatabase[groupKey];
    if (!group) return;
    const minorKeys = Object.keys(group.minorMuscles);
    const allSelected = this.isMajorGroupFullySelected(groupKey);
    
    minorKeys.forEach(key => {
      if (allSelected) {
        this.selectedMuscles.delete(key);
      } else {
        this.selectedMuscles.add(key);
      }
    });
    this.triggerSync();
  }

  // Push state to Supabase or localStorage
  async triggerSync() {
    // Update local UI states first
    updateUIElements(this);
    
    // Save to database
    try {
      const payload = {
        user_id: 'anonymous_user',
        selected_muscles: Array.from(this.selectedMuscles),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('muscle_selections')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.error('Error syncing selections with DB:', error);
        showToast('Sync Failed: Check console', 'error');
      } else {
        showToast(this.isDemoMode ? 'Saved Locally (Demo Mode)' : 'Synced with Supabase Cloud!', 'success');
      }
    } catch (e) {
      console.error('Database Sync exception:', e);
    }
  }

  // Load state from DB on boot
  async loadFromDB() {
    try {
      const { data, error } = await supabase
        .from('muscle_selections')
        .select()
        .limit(1);

      if (error) {
        console.error('Error loading selections:', error);
        showToast('Error loading selections', 'error');
      } else if (data && data.length > 0) {
        const selected = data[0].selected_muscles || [];
        this.selectedMuscles = new Set(selected);
        updateUIElements(this);
        showToast('Selections loaded successfully!', 'success');
      }
    } catch (e) {
      console.error('Load exception:', e);
    }
  }
}

// Global App State Instance
export const state = new AppState();

// --- DOM Rendering Helpers ---

// Toast notification handler
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <span class="toast-text">${message}</span>
  `;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('visible'), 50);

  // Remove toast after duration
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Function to rebuild recommendations based on selected minor muscles
function renderRecommendations(appState) {
  const listContainer = document.getElementById('exercise-list');
  if (!listContainer) return;

  if (appState.selectedMuscles.size === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 12h8"></path>
        </svg>
        <p>No muscles selected. Choose muscle groups from the anatomical visualizer to get tailored exercise suggestions.</p>
      </div>
    `;
    return;
  }

  // Filter exercises where primary or secondary matches selection
  const selectedKeys = Array.from(appState.selectedMuscles);
  const filteredExercises = exerciseDatabase.filter(ex => 
    selectedKeys.includes(ex.primary) || 
    ex.secondary.some(sec => selectedKeys.includes(sec))
  );

  if (filteredExercises.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No exercises registered for selected minor muscles yet.</p>
      </div>
    `;
    return;
  }

  // Generate exercise list
  listContainer.innerHTML = filteredExercises.map(ex => {
    // Locate friendly names for primary / secondary
    const primaryName = findMuscleFriendlyName(ex.primary);
    const secondaryNames = ex.secondary.map(findMuscleFriendlyName).join(', ');
    
    // Check if primary is selected vs secondary
    const isPrimarySelected = appState.isMuscleSelected(ex.primary);

    return `
      <div class="exercise-card ${isPrimarySelected ? 'primary-match' : 'secondary-match'}">
        <div class="ex-header">
          <h4 class="ex-name">${ex.name}</h4>
          <span class="badge badge-difficulty ${ex.difficulty.toLowerCase()}">${ex.difficulty}</span>
        </div>
        <p class="ex-desc">${ex.desc}</p>
        <div class="ex-details">
          <div class="ex-muscle-tag">
            <span class="tag-title">Primary:</span>
            <span class="tag-value highlight-primary">${primaryName}</span>
          </div>
          ${secondaryNames ? `
          <div class="ex-muscle-tag">
            <span class="tag-title">Secondary:</span>
            <span class="tag-value">${secondaryNames}</span>
          </div>
          ` : ''}
        </div>
        <div class="ex-footer">
          <span class="badge badge-category">${ex.category}</span>
          <span class="badge badge-equip">${ex.equipment}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Find friendly name of minor muscle key
function findMuscleFriendlyName(key) {
  for (const groupKey in muscleDatabase) {
    const minorMuscles = muscleDatabase[groupKey].minorMuscles;
    if (minorMuscles[key]) {
      return minorMuscles[key].name;
    }
  }
  return key;
}

// Refresh SVG active states
function syncSVGHighlights(appState) {
  for (const groupKey in muscleDatabase) {
    const isSelected = appState.isMajorGroupActive(groupKey);
    const paths = document.querySelectorAll(`[data-group="${groupKey}"]`);
    paths.forEach(path => {
      if (isSelected) {
        path.classList.add('svg-active');
      } else {
        path.classList.remove('svg-active');
      }
    });
  }
}

// Render checkable list of muscles in sidebar
function renderMuscleControls(appState) {
  const panel = document.getElementById('muscle-controls-panel');
  if (!panel) return;

  let html = '';

  for (const groupKey in muscleDatabase) {
    const group = muscleDatabase[groupKey];
    const isGroupActive = appState.isMajorGroupActive(groupKey);
    const isGroupFullySelected = appState.isMajorGroupFullySelected(groupKey);
    
    html += `
      <div class="control-group-card ${isGroupActive ? 'group-active' : ''}">
        <div class="group-header">
          <div class="group-title-row">
            <h3 class="group-name">${group.name}</h3>
            <span class="region-badge">${group.region.toUpperCase()}</span>
          </div>
          <button class="btn btn-tiny toggle-group-btn" data-group-action="${groupKey}">
            ${isGroupFullySelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div class="minor-muscle-list">
    `;

    for (const minorKey in group.minorMuscles) {
      const minor = group.minorMuscles[minorKey];
      const isSelected = appState.isMuscleSelected(minorKey);
      
      html += `
        <label class="minor-muscle-item ${isSelected ? 'selected' : ''}">
          <input type="checkbox" class="minor-checkbox" data-minor-key="${minorKey}" ${isSelected ? 'checked' : ''}>
          <div class="checkbox-custom"></div>
          <div class="minor-details">
            <div class="minor-name-row">
              <span class="minor-name">${minor.name}</span>
              <span class="minor-type-badge ${minor.type.toLowerCase()}">${minor.type}</span>
            </div>
            <p class="minor-desc">${minor.desc}</p>
          </div>
        </label>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  panel.innerHTML = html;

  // Add Event Listeners for checkboxes and group select buttons
  panel.querySelectorAll('.minor-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const key = e.target.getAttribute('data-minor-key');
      appState.toggleMuscle(key);
    });
  });

  panel.querySelectorAll('.toggle-group-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupKey = e.target.getAttribute('data-group-action');
      appState.toggleMajorGroup(groupKey);
    });
  });
}

// Re-render UI based on current State
export function updateUIElements(appState) {
  renderMuscleControls(appState);
  renderRecommendations(appState);
  syncSVGHighlights(appState);

  // Update Status Badges
  const connectionBadge = document.getElementById('connection-status-badge');
  if (connectionBadge) {
    if (appState.isDemoMode) {
      connectionBadge.textContent = 'DEMO MODE';
      connectionBadge.className = 'status-badge demo';
    } else {
      connectionBadge.textContent = 'CLOUD SYNCED';
      connectionBadge.className = 'status-badge active';
    }
  }

  // Update Selected count
  const countLabel = document.getElementById('selected-count');
  if (countLabel) {
    countLabel.textContent = appState.selectedMuscles.size;
  }
}

// Handle Page Initialization
window.addEventListener('DOMContentLoaded', async () => {
  // Connect configuration panel bindings
  const configBtn = document.getElementById('config-btn');
  const modal = document.getElementById('config-modal');
  const closeModal = document.getElementById('close-modal');
  const configForm = document.getElementById('config-form');
  const resetBtn = document.getElementById('reset-config-btn');

  if (configBtn && modal && closeModal) {
    configBtn.addEventListener('click', () => {
      modal.classList.add('visible');
      // Load current inputs
      document.getElementById('supabase-url-input').value = credentials.url === 'YOUR_SUPABASE_URL' ? '' : credentials.url;
      document.getElementById('supabase-key-input').value = credentials.key === 'YOUR_SUPABASE_ANON_KEY' ? '' : credentials.key;
    });

    closeModal.addEventListener('click', () => modal.classList.remove('visible'));
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  }

  if (configForm) {
    configForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('supabase-url-input').value;
      const key = document.getElementById('supabase-key-input').value;
      window.saveSupabaseConfig(url, key);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      window.resetSupabaseConfig();
    });
  }

  // Bind Clear All button
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.clearAll();
      showToast('All selections cleared', 'success');
    });
  }

  // Bind Visual SVG click events
  const svgWrapper = document.getElementById('visualizer-wrapper');
  if (svgWrapper) {
    svgWrapper.addEventListener('click', (e) => {
      const groupEl = e.target.closest('[data-group]');
      if (groupEl) {
        const groupKey = groupEl.getAttribute('data-group');
        state.toggleMajorGroup(groupKey);
      }
    });
  }

  // Bind Front/Back anatomical tabs
  const tabFront = document.getElementById('tab-front');
  const tabBack = document.getElementById('tab-back');
  const viewFront = document.getElementById('anatomy-front-view');
  const viewBack = document.getElementById('anatomy-back-view');

  if (tabFront && tabBack && viewFront && viewBack) {
    tabFront.addEventListener('click', () => {
      tabFront.classList.add('active');
      tabBack.classList.remove('active');
      viewFront.classList.add('visible');
      viewBack.classList.remove('visible');
    });

    tabBack.addEventListener('click', () => {
      tabBack.classList.add('active');
      tabFront.classList.remove('active');
      viewBack.classList.add('visible');
      viewFront.classList.remove('visible');
    });
  }

  // Load initial selections
  await state.loadFromDB();
  updateUIElements(state);
});
