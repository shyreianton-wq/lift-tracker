export type SetType = 'force' | 'hypertrophie' | 'myo-rep';
export type ExerciseMode = 'reps' | 'time';


export interface WorkoutSet {
  id: string;
  type: SetType;
  targetReps: number;
  targetWeight: number;
  targetDuration?: number;
  completedReps?: number;
  completedWeight?: number;
  completedDuration?: number;
  setType?: SetType; // force, hypertrophie or myo-rep
  rpe?: number;
  myoRestPauseCount?: number; // For myo-rep: how many rest-pause mini-sets completed
  isCompleted: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  mode: ExerciseMode;
  rotationGroup?: string; // deprecated — kept for backward compat
  optional?: boolean; // suggested but not required, shown as optional in UI
  rotationGroupRef?: string; // references a RotationGroupConfig.id — this exercise is a "slot"
  supersetPairId?: string; // when two exercises share the same supersetPairId, they form a superset pair
  restSec?: number; // repos configuré pour cet exo (s) — override du défaut par type ; undefined = auto
}

export type SessionType = 'force' | 'hypertrophie' | 'myo-rep';

export interface Session {
  id: string;
  name: string;
  exercises: Exercise[];
  type?: SessionType;
}

// An exercise variant inside a rotation group config
export interface RotationExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  mode: ExerciseMode;
  notes?: string;
}

// Rotation group configuration at program level
export interface RotationGroupConfig {
  id: string;
  name: string; // display name e.g. "Biceps"
  exercises: RotationExercise[];
}

export interface RotationState {
  [groupId: string]: {
    lastExerciseId: string;
    lastCompletedAt: string;
  };
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  sessions: Session[];
  createdAt: string;
  rotationState?: RotationState;
  rotationGroups?: RotationGroupConfig[];
}

export interface WorkoutHistory {
  id: string;
  programId: string;
  sessionId: string;
  exerciseId: string;
  exerciseName?: string;
  setId: string;
  reps: number;
  weight: number;
  duration?: number;
  setType?: SetType; // force, hypertrophie or myo-rep
  rpe?: number;
  completedAt: string;
  setIndex?: number;
  myoRestPauseCount?: number;
  restSec?: number; // repos réel pris APRÈS cette série (s), dépassement inclus
  plannedRestSec?: number; // chrono de repos configuré/utilisé pour cette série (s)
  extraRestSec?: number; // secondes "grattées" au-delà du chrono prévu (overtime)
}

export interface ActiveWorkout {
  programId: string;
  sessionId: string;
  startedAt: string;
  currentExerciseIndex: number;
  completedSets: Record<string, WorkoutSet>;
  activeRotations?: Record<string, string>; // groupId -> active exerciseId
  // In-session edits (cleared when the workout ends via setActiveWorkout(null))
  exerciseOverrides?: Record<string, { name: string; historyId?: string }>;
  addedExercises?: Exercise[];
  addedSets?: Record<string, WorkoutSet[]>;
}
