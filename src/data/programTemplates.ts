export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'forearms';

export interface ExerciseVariant {
  name: string;
  nameEn?: string;
  mode: 'reps' | 'time';
}

export interface ExerciseSlot {
  id: string;
  muscleGroup: MuscleGroup;
  slotLabel: string;
  defaultExercise: string;
  variants: ExerciseVariant[];
  sets: { beginner: number; intermediate: number; advanced: number };
  reps: { beginner: string; intermediate: string; advanced: string };
  defaultSetType: {
    beginner: 'force';
    intermediate: 'force' | 'hypertrophie' | 'myo-rep';
    advanced: 'force' | 'hypertrophie' | 'myo-rep';
  };
  optional?: boolean;
}

export interface SessionTemplate {
  id: string;
  name: string;
  exercises: ExerciseSlot[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  daysPerWeek: string;
  sessions: SessionTemplate[];
}

// ────────────────────────────────────────────────────────────────────────────────
// EXERCISE LIBRARY
// ────────────────────────────────────────────────────────────────────────────────

const PUSH_CHEST: ExerciseSlot = {
  id: 'slot-push-chest',
  muscleGroup: 'chest',
  slotLabel: 'Push Horizontal (Pecs)',
  defaultExercise: 'Développé couché Barre',
  variants: [
    { name: 'Développé couché Barre', mode: 'reps' },
    { name: 'Développé couché Haltères', mode: 'reps' },
    { name: 'Développé incliné Barre', mode: 'reps' },
    { name: 'Développé incliné Haltères', mode: 'reps' },
    { name: 'Développé décliné Barre', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '6-10', advanced: '6-8' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'hypertrophie' },
};

const PUSH_FLY: ExerciseSlot = {
  id: 'slot-push-fly',
  muscleGroup: 'chest',
  slotLabel: 'Isolation Pecs (Écarté)',
  defaultExercise: 'Écarté Poulie',
  variants: [
    { name: 'Écarté Poulie', mode: 'reps' },
    { name: 'Écarté Haltères', mode: 'reps' },
    { name: 'Écarté Machine', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '10-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
};

const PUSH_DIPS: ExerciseSlot = {
  id: 'slot-push-dips',
  muscleGroup: 'triceps',
  slotLabel: 'Dips (Pecs/Triceps)',
  defaultExercise: 'Dips',
  variants: [{ name: 'Dips', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '8-10', intermediate: '8-12', advanced: '10-15' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: false,
};

const PUSH_SHOULDER_PRESS: ExerciseSlot = {
  id: 'slot-push-shoulder-press',
  muscleGroup: 'shoulders',
  slotLabel: 'Push Vertical (Épaules)',
  defaultExercise: 'Développé militaire Barre',
  variants: [
    { name: 'Développé militaire Barre', mode: 'reps' },
    { name: 'Développé militaire Haltères', mode: 'reps' },
    { name: 'Arnold Press', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '8-10', advanced: '6-10' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
};

const PUSH_LATERAL_RAISE: ExerciseSlot = {
  id: 'slot-push-lateral',
  muscleGroup: 'shoulders',
  slotLabel: 'Isolation Épaules (Latéral)',
  defaultExercise: 'Élévations latérales Haltères',
  variants: [
    { name: 'Élévations latérales Haltères', mode: 'reps' },
    { name: 'Élévations latérales Poulie', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '12-15', intermediate: '12-15', advanced: '12-20' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
};

const PUSH_FACE_PULL: ExerciseSlot = {
  id: 'slot-push-facepull',
  muscleGroup: 'shoulders',
  slotLabel: 'Tirage Face (Épaules post.)',
  defaultExercise: 'Face Pull',
  variants: [{ name: 'Face Pull', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 3, advanced: 3 },
  reps: { beginner: '12-15', intermediate: '15-20', advanced: '15-20' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: true,
};

const PUSH_TRICEPS_PUSHDOWN: ExerciseSlot = {
  id: 'slot-push-triceps-pushdown',
  muscleGroup: 'triceps',
  slotLabel: 'Isolation Triceps (Pushdown)',
  defaultExercise: 'Triceps Pushdown Corde',
  variants: [
    { name: 'Triceps Pushdown Corde', mode: 'reps' },
    { name: 'Triceps Pushdown Barre', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '10-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
};

const PUSH_TRICEPS_EXT: ExerciseSlot = {
  id: 'slot-push-triceps-ext',
  muscleGroup: 'triceps',
  slotLabel: 'Isolation Triceps (Extension)',
  defaultExercise: 'Extensions Overhead Haltère',
  variants: [
    { name: 'Extensions Overhead Haltère', mode: 'reps' },
    { name: 'Skullcrusher', mode: 'reps' },
    { name: 'Extensions Poulie haute', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-12', intermediate: '10-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
  optional: true,
};

const PULL_ROW: ExerciseSlot = {
  id: 'slot-pull-row',
  muscleGroup: 'back',
  slotLabel: 'Tirage Horizontal (Dos)',
  defaultExercise: 'Rowing Barre',
  variants: [
    { name: 'Rowing Barre', mode: 'reps' },
    { name: 'Rowing Haltères', mode: 'reps' },
    { name: 'Rowing T-bar', mode: 'reps' },
    { name: 'Rowing Poulie basse', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '6-10', advanced: '6-8' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
};

const PULL_PULLDOWN: ExerciseSlot = {
  id: 'slot-pull-pulldown',
  muscleGroup: 'back',
  slotLabel: 'Tirage Vertical (Dos)',
  defaultExercise: 'Tirage vertical Poulie large',
  variants: [
    { name: 'Tirage vertical Poulie large', mode: 'reps' },
    { name: 'Tirage vertical Poulie serrée', mode: 'reps' },
    { name: 'Tractions', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '8-12', advanced: '8-12' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
};

const PULL_PULLOVER: ExerciseSlot = {
  id: 'slot-pull-pullover',
  muscleGroup: 'back',
  slotLabel: 'Pullover (Dos/Pecs)',
  defaultExercise: 'Pullover Haltère',
  variants: [
    { name: 'Pullover Haltère', mode: 'reps' },
    { name: 'Pullover Poulie', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '12-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
  optional: true,
};

const PULL_CURL: ExerciseSlot = {
  id: 'slot-pull-curl',
  muscleGroup: 'biceps',
  slotLabel: 'Isolation Biceps',
  defaultExercise: 'Curl Barre',
  variants: [
    { name: 'Curl Barre', mode: 'reps' },
    { name: 'Curl Haltères', mode: 'reps' },
    { name: 'Curl EZ Bar', mode: 'reps' },
    { name: 'Curl Poulie', mode: 'reps' },
    { name: 'Curl Marteau', mode: 'reps' },
    { name: 'Curl Incliné', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '8-12', advanced: '10-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
};

const LEGS_SQUAT: ExerciseSlot = {
  id: 'slot-legs-squat',
  muscleGroup: 'quads',
  slotLabel: 'Squat (Quadriceps)',
  defaultExercise: 'Squat Barre',
  variants: [
    { name: 'Squat Barre', mode: 'reps' },
    { name: 'Front Squat', mode: 'reps' },
    { name: 'Goblet Squat', mode: 'reps' },
    { name: 'Hack Squat', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '6-10', advanced: '6-8' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
};

const LEGS_PRESS: ExerciseSlot = {
  id: 'slot-legs-press',
  muscleGroup: 'quads',
  slotLabel: 'Presse (Quadriceps)',
  defaultExercise: 'Presse à cuisses',
  variants: [{ name: 'Presse à cuisses', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '10-15', advanced: '10-15' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'hypertrophie' },
};

const LEGS_LEG_EXT: ExerciseSlot = {
  id: 'slot-legs-leg-ext',
  muscleGroup: 'quads',
  slotLabel: 'Isolation Quadriceps',
  defaultExercise: 'Leg Extension',
  variants: [{ name: 'Leg Extension', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '12-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
  optional: true,
};

const LEGS_LUNGE: ExerciseSlot = {
  id: 'slot-legs-lunge',
  muscleGroup: 'quads',
  slotLabel: 'Fentes (Quadriceps/Fessiers)',
  defaultExercise: 'Fentes Haltères',
  variants: [
    { name: 'Fentes Haltères', mode: 'reps' },
    { name: 'Fentes Barre', mode: 'reps' },
    { name: 'Bulgarian Split Squat', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-12', intermediate: '10-12', advanced: '8-12' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: true,
};

const LEGS_RDL: ExerciseSlot = {
  id: 'slot-legs-rdl',
  muscleGroup: 'hamstrings',
  slotLabel: 'Hip Hinge (Ischio-jambiers)',
  defaultExercise: 'Romanian Deadlift Barre',
  variants: [
    { name: 'Romanian Deadlift Barre', mode: 'reps' },
    { name: 'Romanian Deadlift Haltères', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 4, advanced: 4 },
  reps: { beginner: '8-12', intermediate: '8-10', advanced: '6-10' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
};

const LEGS_LEG_CURL: ExerciseSlot = {
  id: 'slot-legs-leg-curl',
  muscleGroup: 'hamstrings',
  slotLabel: 'Isolation Ischio-jambiers',
  defaultExercise: 'Leg Curl Allongé',
  variants: [
    { name: 'Leg Curl Allongé', mode: 'reps' },
    { name: 'Leg Curl Assis', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '10-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'hypertrophie', advanced: 'hypertrophie' },
};

const LEGS_GOOD_MORNING: ExerciseSlot = {
  id: 'slot-legs-good-morning',
  muscleGroup: 'hamstrings',
  slotLabel: 'Good Morning (Chaîne post.)',
  defaultExercise: 'Good Morning',
  variants: [{ name: 'Good Morning', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 3, advanced: 3 },
  reps: { beginner: '12-15', intermediate: '12-15', advanced: '12-15' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: true,
};

const LEGS_CALVES: ExerciseSlot = {
  id: 'slot-legs-calves',
  muscleGroup: 'calves',
  slotLabel: 'Mollets',
  defaultExercise: 'Mollets Debout',
  variants: [
    { name: 'Mollets Debout', mode: 'reps' },
    { name: 'Mollets Assis', mode: 'reps' },
    { name: 'Mollets Presse', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '15-20', intermediate: '15-20', advanced: '15-20' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'hypertrophie' },
};

const LEGS_HIP_THRUST: ExerciseSlot = {
  id: 'slot-legs-hip-thrust',
  muscleGroup: 'glutes',
  slotLabel: 'Hip Thrust (Fessiers)',
  defaultExercise: 'Hip Thrust',
  variants: [{ name: 'Hip Thrust', mode: 'reps' }],
  sets: { beginner: 3, intermediate: 3, advanced: 4 },
  reps: { beginner: '10-15', intermediate: '10-15', advanced: '10-15' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'hypertrophie' },
  optional: true,
};

const ABS: ExerciseSlot = {
  id: 'slot-abs',
  muscleGroup: 'abs',
  slotLabel: 'Abdominaux',
  defaultExercise: 'Crunch Poulie',
  variants: [
    { name: 'Crunch Poulie', mode: 'reps' },
    { name: 'Relevé de jambes', mode: 'reps' },
  ],
  sets: { beginner: 3, intermediate: 3, advanced: 3 },
  reps: { beginner: '12-15', intermediate: '15-20', advanced: '15-20' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: true,
};

const FOREARMS: ExerciseSlot = {
  id: 'slot-forearms',
  muscleGroup: 'forearms',
  slotLabel: 'Avant-bras',
  defaultExercise: 'Avant-bras',
  variants: [{ name: 'Avant-bras', mode: 'time' }],
  sets: { beginner: 2, intermediate: 3, advanced: 3 },
  reps: { beginner: '30s', intermediate: '45s', advanced: '60s' },
  defaultSetType: { beginner: 'force', intermediate: 'force', advanced: 'force' },
  optional: true,
};

// ────────────────────────────────────────────────────────────────────────────────
// UPPER BODY SESSIONS (for Upper/Lower)
// ────────────────────────────────────────────────────────────────────────────────

const UPPER_A: SessionTemplate = {
  id: 'session-upper-a',
  name: 'Upper A',
  exercises: [
    PUSH_CHEST,
    PULL_ROW,
    PUSH_SHOULDER_PRESS,
    PULL_PULLDOWN,
    PUSH_LATERAL_RAISE,
    PUSH_TRICEPS_PUSHDOWN,
    PULL_CURL,
  ],
};

const UPPER_B: SessionTemplate = {
  id: 'session-upper-b',
  name: 'Upper B',
  exercises: [
    PULL_ROW,
    PUSH_CHEST,
    PULL_PULLDOWN,
    PUSH_SHOULDER_PRESS,
    PULL_CURL,
    PUSH_TRICEPS_EXT,
    PUSH_FACE_PULL,
  ],
};

const LOWER_A: SessionTemplate = {
  id: 'session-lower-a',
  name: 'Lower A',
  exercises: [
    LEGS_SQUAT,
    LEGS_RDL,
    LEGS_LEG_CURL,
    LEGS_LEG_EXT,
    LEGS_CALVES,
    ABS,
  ],
};

const LOWER_B: SessionTemplate = {
  id: 'session-lower-b',
  name: 'Lower B',
  exercises: [
    LEGS_PRESS,
    LEGS_RDL,
    LEGS_LUNGE,
    LEGS_LEG_CURL,
    LEGS_HIP_THRUST,
    LEGS_CALVES,
  ],
};

// ────────────────────────────────────────────────────────────────────────────────
// PPL SESSIONS
// ────────────────────────────────────────────────────────────────────────────────

const PUSH_SESSION: SessionTemplate = {
  id: 'session-push',
  name: 'Push',
  exercises: [
    PUSH_CHEST,
    PUSH_SHOULDER_PRESS,
    PUSH_LATERAL_RAISE,
    PUSH_DIPS,
    PUSH_TRICEPS_PUSHDOWN,
    PUSH_FLY,
    PUSH_TRICEPS_EXT,
  ],
};

const PULL_SESSION: SessionTemplate = {
  id: 'session-pull',
  name: 'Pull',
  exercises: [
    PULL_ROW,
    PULL_PULLDOWN,
    PUSH_FACE_PULL,
    PULL_CURL,
    FOREARMS,
  ],
};

const LEGS_SESSION: SessionTemplate = {
  id: 'session-legs',
  name: 'Legs',
  exercises: [
    LEGS_SQUAT,
    LEGS_PRESS,
    LEGS_RDL,
    LEGS_LEG_CURL,
    LEGS_LEG_EXT,
    LEGS_HIP_THRUST,
    LEGS_CALVES,
    ABS,
  ],
};

// ────────────────────────────────────────────────────────────────────────────────
// FULL BODY SESSIONS
// ────────────────────────────────────────────────────────────────────────────────

const FB_A: SessionTemplate = {
  id: 'session-fb-a',
  name: 'Full Body A',
  exercises: [
    LEGS_SQUAT,
    PUSH_CHEST,
    PULL_ROW,
    PUSH_SHOULDER_PRESS,
    PULL_CURL,
    PUSH_TRICEPS_PUSHDOWN,
    LEGS_CALVES,
    ABS,
  ],
};

const FB_B: SessionTemplate = {
  id: 'session-fb-b',
  name: 'Full Body B',
  exercises: [
    LEGS_RDL,
    PULL_PULLDOWN,
    PUSH_CHEST,
    PUSH_LATERAL_RAISE,
    LEGS_LEG_CURL,
    PULL_CURL,
    PUSH_TRICEPS_EXT,
    LEGS_CALVES,
  ],
};

const FB_C: SessionTemplate = {
  id: 'session-fb-c',
  name: 'Full Body C',
  exercises: [
    LEGS_PRESS,
    PULL_ROW,
    PUSH_SHOULDER_PRESS,
    LEGS_RDL,
    PUSH_FLY,
    LEGS_LEG_EXT,
    PULL_CURL,
    ABS,
  ],
};

// ────────────────────────────────────────────────────────────────────────────────
// PROGRAM TEMPLATES
// ────────────────────────────────────────────────────────────────────────────────

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl',
    name: 'PPL',
    description: 'Push / Pull / Legs — idéal pour l\'hypertrophie ciblée',
    daysPerWeek: '3 à 6j/sem',
    sessions: [PUSH_SESSION, PULL_SESSION, LEGS_SESSION],
  },
  {
    id: 'fullbody',
    name: 'Full Body',
    description: 'Full Body — efficace pour débutants ou emploi du temps chargé',
    daysPerWeek: '3j/sem',
    sessions: [FB_A, FB_B, FB_C],
  },
  {
    id: 'upperlower',
    name: 'Upper / Lower',
    description: 'Upper / Lower — bon mix force + hypertrophie',
    daysPerWeek: '4j/sem',
    sessions: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  },
];
