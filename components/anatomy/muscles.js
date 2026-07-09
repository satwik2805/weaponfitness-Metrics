/**
 * Muscle taxonomy for the anatomy explorer — one source of truth shared by the
 * figure highlighter, the selector chips, and the exercise recommendations.
 *
 * `slugs` are the body-part slugs understood by react-native-body-highlighter@3
 * (abs, biceps, calves, chest, deltoids, gluteal, hamstring, lower-back,
 * obliques, quadriceps, trapezius, triceps, upper-back, …). The earlier code
 * mapped "shoulders" to non-existent slugs ("front-deltoids", "deltoid") and
 * "back" to "latissimus_dorsi", so those groups never highlighted.
 */

export const MUSCLE_GROUPS = [
  {
    key: 'chest',
    label: 'Chest',
    slugs: ['chest'],
    encouragement: 'Fabulous choice! Let\'s power up your upper body.',
    importance: 'The chest (pectorals) drives all horizontal pushing movements and stabilizes the shoulder girdle.'
  },
  {
    key: 'back',
    label: 'Back',
    slugs: ['trapezius', 'upper-back', 'lower-back'],
    encouragement: 'Outstanding selection! A strong back is the foundation of great posture.',
    importance: 'The back muscles support your spine, pull the shoulders back, and drive all pulling movements.'
  },
  {
    key: 'shoulders',
    label: 'Shoulders',
    slugs: ['deltoids'],
    encouragement: 'Excellent choice! Let\'s build robust, healthy shoulders.',
    importance: 'The shoulders (deltoids) enable full arm rotation and press weights overhead safely.'
  },
  {
    key: 'biceps',
    label: 'Biceps',
    slugs: ['biceps'],
    encouragement: 'Fabulous choice! Time to focus on pulling strength and arm definition.',
    importance: 'Biceps pull things closer and assist with forearm rotation and elbow flexion.'
  },
  {
    key: 'triceps',
    label: 'Triceps',
    slugs: ['triceps'],
    encouragement: 'Great pick! The triceps are the key to real upper body pressing power.',
    importance: 'Triceps make up 60% of upper arm size and are the primary muscles for elbow extension.'
  },
  {
    key: 'core',
    label: 'Core',
    slugs: ['abs', 'obliques'],
    encouragement: 'Superb choice! A solid core transfers power to every movement.',
    importance: 'The core stabilizes the spine, prevents lower back pain, and controls pelvic rotation.'
  },
  {
    key: 'quads',
    label: 'Quads',
    slugs: ['quadriceps'],
    encouragement: 'Fabulous choice! Leg day starts with the mighty quadriceps.',
    importance: 'Quads extend the knees, absorb impact, and drive sprinting and jumping strength.'
  },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    slugs: ['hamstring'],
    encouragement: 'Perfect choice! Hamstrings are crucial for athletic speed and knee safety.',
    importance: 'Hamstrings flex the knees, extend the hips, and protect the ACL from injury.'
  },
  {
    key: 'glutes',
    label: 'Glutes',
    slugs: ['gluteal'],
    encouragement: 'Awesome selection! The glutes are the strongest muscle group in the body.',
    importance: 'Glutes drive hip extension, stabilize the pelvis, and power walking, running, and climbing.'
  },
  {
    key: 'calves',
    label: 'Calves',
    slugs: ['calves'],
    encouragement: 'Fantastic pick! Strong calves build explosive springiness.',
    importance: 'Calves flex the ankle joint and push off the ground during walking and running.'
  },
  {
    key: 'forearms',
    label: 'Forearms',
    slugs: ['forearm'],
    encouragement: 'Brilliant choice! Grip strength is a direct indicator of overall longevity.',
    importance: 'Forearms control hand grip, finger extension, and wrist stability under heavy loads.'
  },
  {
    key: 'adductors',
    label: 'Adductors',
    slugs: ['adductors'],
    encouragement: 'Smart selection! Adductors are the unsung heroes of hip stability.',
    importance: 'Adductors pull the thighs together and stabilize the pelvis during squats and lunges.'
  },
  {
    key: 'neck',
    label: 'Neck',
    slugs: ['neck'],
    encouragement: 'Remarkable choice! A strong neck protects the spine and improves posture.',
    importance: 'Neck muscles support the skull, rotate the head, and absorb shock during impact sports.'
  },
  {
    key: 'tibialis',
    label: 'Tibialis',
    slugs: ['tibialis'],
    encouragement: 'Incredible pick! The first line of defense for shin splints.',
    importance: 'The tibialis anterior pulls the toes up and acts as the brakes for knee pressure.'
  },
  {
    key: 'hands',
    label: 'Hands',
    slugs: ['hands'],
    encouragement: 'Great choice! Grip strength is essential for control in all lifts.',
    importance: 'Hand muscles flex the fingers to secure hold of weights, handles, and bars.'
  },
  {
    key: 'feet',
    label: 'Feet',
    slugs: ['feet'],
    encouragement: 'Superb selection! Healthy feet are the base of all movement.',
    importance: 'Foot muscles support the arches, balance the body, and absorb ground forces.'
  },
  {
    key: 'knees',
    label: 'Knees',
    slugs: ['knees'],
    encouragement: 'Fabulous choice! Bulletproofing the knees unlocks lifelong athleticism.',
    importance: 'Knee stabilizers guide leg extension and absorb torque during directional cuts.'
  },
];

export const GROUP_BY_KEY = MUSCLE_GROUPS.reduce((acc, g) => {
  acc[g.key] = g;
  return acc;
}, {});

// body-part slug -> group key, for taps on the figure itself.
export const SLUG_TO_GROUP = MUSCLE_GROUPS.reduce((acc, g) => {
  g.slugs.forEach((s) => {
    acc[s] = g.key;
  });
  return acc;
}, {});

/**
 * Reference exercises per group, each with a YouTube link rendered inline.
 * These are a learning library (good form for a movement that targets the
 * muscle) — not the member's assigned plan, so they deliberately don't touch
 * the logging flow.
 */
export const MUSCLE_EXERCISES = {
  chest: [
    { id: 'bench-press', name: 'Bench Press', cue: 'Lie back, lower the bar to mid-chest, press up.', videoUrl: 'https://www.youtube.com/watch?v=ysUTNll8JQ8' },
    { id: 'push-up', name: 'Push-Up', cue: 'Plank tight, lower chest to the floor, drive up.', videoUrl: 'https://www.youtube.com/watch?v=i9sTjhN4Z3M' },
    { id: 'db-fly', name: 'Dumbbell Fly', cue: 'Slight elbow bend, open wide, hug the weights back.', videoUrl: 'https://www.youtube.com/watch?v=QENKPHhQVi4' },
  ],
  back: [
    { id: 'pull-up', name: 'Pull-Up', cue: 'Hang, pull the chin over the bar, control the descent.', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
    { id: 'barbell-row', name: 'Barbell Row', cue: 'Hinge over, pull the bar to your waist, squeeze.', videoUrl: 'https://www.youtube.com/watch?v=DAKGiwO9Gj0' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', cue: 'Tall chest, pull the bar to your collarbone.', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
  ],
  shoulders: [
    { id: 'overhead-press', name: 'Overhead Press', cue: 'Brace, press the bar overhead, finish with biceps by ears.', videoUrl: 'https://www.youtube.com/watch?v=0n86YPrgDBs' },
    { id: 'lateral-raise', name: 'Lateral Raise', cue: 'Soft elbows, raise to shoulder height, lower slowly.', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
  ],
  biceps: [
    { id: 'bicep-curl', name: 'Bicep Curl', cue: 'Elbows pinned, curl up, squeeze at the top.', videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
    { id: 'hammer-curl', name: 'Hammer Curl', cue: 'Neutral grip, curl, keep the wrists straight.', videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
  ],
  triceps: [
    { id: 'tricep-extension', name: 'Tricep Extension', cue: 'Elbows high and still, extend overhead.', videoUrl: 'https://www.youtube.com/watch?v=KRUrrf-ANao' },
    { id: 'dip', name: 'Dip', cue: 'Lean slightly forward, lower, press back to lockout.', videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As' },
  ],
  core: [
    { id: 'plank', name: 'Plank', cue: 'Straight line head to heels, ribs down, breathe.', videoUrl: 'https://www.youtube.com/watch?v=pSHjTRCQxIw' },
    { id: 'crunch', name: 'Crunch', cue: 'Lift the shoulder blades, exhale, control down.', videoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU' },
    { id: 'leg-raise', name: 'Leg Raise', cue: 'Lower back flat, raise straight legs, lower slow.', videoUrl: 'https://www.youtube.com/watch?v=l4kQd9eWclE' },
  ],
  quads: [
    { id: 'squat', name: 'Back Squat', cue: 'Brace, sit between the hips, drive the floor away.', videoUrl: 'https://www.youtube.com/watch?v=1oed-UmAxFs' },
    { id: 'leg-extension', name: 'Leg Extension', cue: 'Drive the shins up, pause, lower under control.', videoUrl: 'https://www.youtube.com/watch?v=YyvSfVjQeL0' },
  ],
  hamstrings: [
    { id: 'deadlift', name: 'Deadlift', cue: 'Flat back, push the floor, lock the hips at the top.', videoUrl: 'https://www.youtube.com/watch?v=dBXnS-c5r0Q' },
    { id: 'leg-curl', name: 'Leg Curl', cue: 'Curl the heels toward your seat, squeeze, lower slow.', videoUrl: 'https://www.youtube.com/watch?v=ELOCsoDSmrg' },
  ],
  glutes: [
    { id: 'hip-thrust', name: 'Hip Thrust', cue: 'Drive through the heels, squeeze the glutes at the top.', videoUrl: 'https://www.youtube.com/watch?v=S_uZP4UH6J0' },
    { id: 'walking-lunge', name: 'Walking Lunge', cue: 'Long step, back knee to the floor, drive forward.', videoUrl: 'https://www.youtube.com/watch?v=3XDriUn0udo' },
  ],
  calves: [
    { id: 'calf-raise', name: 'Calf Raise', cue: 'Rise onto the toes, pause at the top, lower fully.', videoUrl: 'https://www.youtube.com/watch?v=DZ92J1jdwts' },
  ],
  forearms: [
    { id: 'reverse-curl', name: 'Reverse Barbell Curl', cue: 'Pronated grip, curl the bar up to engage the brachioradialis.', videoUrl: 'https://www.youtube.com/watch?v=yIUKi1goT-g' },
    { id: 'wrist-curl', name: 'Wrist Curl', cue: 'Rest forearms on bench, curl wrists upward to target wrist flexors.', videoUrl: 'https://www.youtube.com/watch?v=7ac_qmBjkFI' },
  ],
  adductors: [
    { id: 'seated-adductor', name: 'Seated Adductor Machine', cue: 'Sit tall, squeeze thighs inward under control.', videoUrl: 'https://www.youtube.com/watch?v=BmMmt-c9aNM' },
    { id: 'cable-adduction', name: 'Cable Hip Adduction', cue: 'Attach ankle strap, swing leg across body with control.', videoUrl: 'https://www.youtube.com/watch?v=gdXIIVY8wIY' },
  ],
  neck: [
    { id: 'barbell-shrug', name: 'Barbell Shrug', cue: 'Hold bar in front of hips, shrug shoulders straight up, hold and lower.', videoUrl: 'https://www.youtube.com/watch?v=rFsSeClGnNA' },
    { id: 'db-shrug', name: 'Dumbbell Shrug', cue: 'Hold dumbbells by your sides, raise shoulders straight up, squeeze traps.', videoUrl: 'https://www.youtube.com/watch?v=qvvJUKq7_sU' },
  ],
  tibialis: [
    { id: 'calf-press-leg-press', name: 'Leg Press Calf Press', cue: 'Place balls of feet on bottom edge of platform, press up and lower fully.', videoUrl: 'https://www.youtube.com/watch?v=QkvgUYtQT38' },
  ],
  hands: [
    { id: 'farmers-walk', name: "Farmer's Walk", cue: 'Hold heavy weights, stand tall, walk slowly with engaged grip.', videoUrl: 'https://www.youtube.com/watch?v=1uOs1hP3u4A' },
  ],
  feet: [
    { id: 'feet-calf-raise', name: 'Standing Calf Raise', cue: 'Rise onto the toes to stretch and strengthen the foot arches and Achilles.', videoUrl: 'https://www.youtube.com/watch?v=wdOkFomQNp8' },
  ],
  knees: [
    { id: 'goblet-squat', name: 'Goblet Squat', cue: 'Hold weight at chest, sit down deeply to load knees safely.', videoUrl: 'https://www.youtube.com/watch?v=lRYBbchqxtI' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', cue: 'Elevate back foot, squat down to strengthen knee stability.', videoUrl: 'https://www.youtube.com/watch?v=or1frhkjBDc' },
    { id: 'db-reverse-lunge', name: 'Dumbbell Reverse Lunge', cue: 'Take a step back and lower knee toward floor to build single-leg power.', videoUrl: 'https://www.youtube.com/watch?v=J9MpoAQCjos' },
  ],
};

/** Extract a YouTube video id from a watch URL (null if it can't be parsed). */
export const youtubeId = (url) => {
  if (!url) return null;
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
};
