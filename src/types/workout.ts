export type SetType = 'force' | 'myo-rep';

export interface WorkoutSet {
  id: string;
  type: SetType;
  targetReps: number;
  targetWeight: number;
  completedReps?: number;
  completedWeight?: number;
  isCompleted: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Session {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  sessions: Session[];
  createdAt: string;
}

export interface WorkoutHistory {
  id: string;
  programId: string;
  sessionId: string;
  exerciseId: string;
  setId: string;
  reps: number;
  weight: number;
  completedAt: string;
}

export interface ActiveWorkout {
  programId: string;
  sessionId: string;
  startedAt: string;
  currentExerciseIndex: number;
  completedSets: Record<string, WorkoutSet>;
}
