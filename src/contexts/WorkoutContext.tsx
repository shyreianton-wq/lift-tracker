import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkoutData } from '@/hooks/useWorkoutData';
import { Program, WorkoutHistory, ActiveWorkout, WorkoutSet, Exercise, SetType } from '@/types/workout';

interface WorkoutContextType {
  programs: Program[];
  history: WorkoutHistory[];
  activeWorkout: ActiveWorkout | null;
  isLoaded: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  getLocalBackup: () => WorkoutHistory[];
  pushLocalEntries: (entries: WorkoutHistory[]) => void;
  clearLocalBackup: () => void;
  addHistoryEntries: (entries: WorkoutHistory[]) => void;
  addProgram: (program: Program) => void;
  updateProgram: (program: Program) => void;
  deleteProgram: (programId: string) => void;
  startWorkout: (programId: string, sessionId: string) => void;
  updateActiveWorkout: (updates: Partial<ActiveWorkout>) => void;
  completeSet: (exerciseId: string, setId: string, completedSet: WorkoutSet, exerciseName?: string, setIndex?: number) => string;
  setHistoryRest: (entryId: string, patch: { restSec?: number; plannedRestSec?: number; extraRestSec?: number }) => void;
  endWorkout: () => void;
  getLastPerformance: (programId: string, sessionId: string, exerciseId: string, setId: string, setType?: SetType, exerciseName?: string, setIndex?: number) => WorkoutHistory | undefined;
  getPreviousSessionForExercise: (programId: string, sessionId: string, exerciseName: string) => Map<number, WorkoutHistory>;
  migrateHistoryExerciseName: (oldName: string, newName: string) => void;
  isExerciseActive: (exercise: Exercise) => boolean;
  resolveExercises: (exercises: Exercise[]) => Exercise[];
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const workoutData = useWorkoutData();

  return (
    <WorkoutContext.Provider value={workoutData}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
