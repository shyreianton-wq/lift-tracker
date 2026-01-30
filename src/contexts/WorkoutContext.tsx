import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkoutData } from '@/hooks/useWorkoutData';
import { Program, WorkoutHistory, ActiveWorkout, WorkoutSet } from '@/types/workout';

interface WorkoutContextType {
  programs: Program[];
  history: WorkoutHistory[];
  activeWorkout: ActiveWorkout | null;
  isLoaded: boolean;
  addProgram: (program: Program) => void;
  updateProgram: (program: Program) => void;
  deleteProgram: (programId: string) => void;
  startWorkout: (programId: string, sessionId: string) => void;
  completeSet: (exerciseId: string, setId: string, completedSet: WorkoutSet) => void;
  endWorkout: () => void;
  getLastPerformance: (programId: string, sessionId: string, exerciseId: string, setId: string) => WorkoutHistory | undefined;
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
