import { useState, useEffect, useCallback } from 'react';
import { Program, WorkoutHistory, ActiveWorkout, WorkoutSet } from '@/types/workout';

const PROGRAMS_KEY = 'workout_programs';
const HISTORY_KEY = 'workout_history';
const ACTIVE_WORKOUT_KEY = 'active_workout';

export function useWorkoutData() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedPrograms = localStorage.getItem(PROGRAMS_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    const savedActiveWorkout = localStorage.getItem(ACTIVE_WORKOUT_KEY);

    if (savedPrograms) setPrograms(JSON.parse(savedPrograms));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedActiveWorkout) setActiveWorkout(JSON.parse(savedActiveWorkout));
    setIsLoaded(true);
  }, []);

  // Save programs to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
    }
  }, [programs, isLoaded]);

  // Save history to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history, isLoaded]);

  // Save active workout to localStorage
  useEffect(() => {
    if (isLoaded) {
      if (activeWorkout) {
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout));
      } else {
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      }
    }
  }, [activeWorkout, isLoaded]);

  const addProgram = useCallback((program: Program) => {
    setPrograms(prev => [...prev, program]);
  }, []);

  const updateProgram = useCallback((program: Program) => {
    setPrograms(prev => prev.map(p => p.id === program.id ? program : p));
  }, []);

  const deleteProgram = useCallback((programId: string) => {
    setPrograms(prev => prev.filter(p => p.id !== programId));
  }, []);

  const startWorkout = useCallback((programId: string, sessionId: string) => {
    setActiveWorkout({
      programId,
      sessionId,
      startedAt: new Date().toISOString(),
      currentExerciseIndex: 0,
      completedSets: {},
    });
  }, []);

  const completeSet = useCallback((
    exerciseId: string,
    setId: string,
    completedSet: WorkoutSet
  ) => {
    if (!activeWorkout) return;

    // Update active workout
    setActiveWorkout(prev => prev ? {
      ...prev,
      completedSets: {
        ...prev.completedSets,
        [`${exerciseId}-${setId}`]: completedSet,
      },
    } : null);

    // Add to history
    const historyEntry: WorkoutHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      programId: activeWorkout.programId,
      sessionId: activeWorkout.sessionId,
      exerciseId,
      setId,
      reps: completedSet.completedReps || 0,
      weight: completedSet.completedWeight || 0,
      completedAt: new Date().toISOString(),
    };

    setHistory(prev => [...prev, historyEntry]);
  }, [activeWorkout]);

  const endWorkout = useCallback(() => {
    setActiveWorkout(null);
  }, []);

  const getLastPerformance = useCallback((
    programId: string,
    sessionId: string,
    exerciseId: string,
    setId: string
  ): WorkoutHistory | undefined => {
    return history
      .filter(h => 
        h.programId === programId &&
        h.sessionId === sessionId &&
        h.exerciseId === exerciseId &&
        h.setId === setId
      )
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  }, [history]);

  return {
    programs,
    history,
    activeWorkout,
    isLoaded,
    addProgram,
    updateProgram,
    deleteProgram,
    startWorkout,
    completeSet,
    endWorkout,
    getLastPerformance,
  };
}
