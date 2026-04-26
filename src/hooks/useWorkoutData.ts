import { useState, useEffect, useCallback, useRef } from 'react';
import { Program, WorkoutHistory, ActiveWorkout, WorkoutSet, Exercise, RotationGroupConfig, SetType } from '@/types/workout';
import { API_URL } from '@/config';

// === LEGACY: old per-exercise rotationGroup field ===
function getRotationGroupExercises(program: Program, groupId: string): Exercise[] {
  const exercises: Exercise[] = [];
  for (const session of program.sessions) {
    for (const exercise of session.exercises) {
      if (exercise.rotationGroup === groupId) {
        exercises.push(exercise);
      }
    }
  }
  return exercises;
}

// === NEW: rotation group configs at program level ===
function computeActiveRotationsNew(program: Program, history: WorkoutHistory[]): Record<string, string> {
  const activeRotations: Record<string, string> = {};
  
  if (!program.rotationGroups) return activeRotations;

  for (const group of program.rotationGroups) {
    if (group.exercises.length === 0) continue;

    const groupExerciseIds = new Set(group.exercises.map(e => e.id));
    const groupExerciseNames = new Map(group.exercises.map(e => [e.name, e.id]));
    const lastCompleted = history
      .filter(h => h.programId === program.id && (
        groupExerciseIds.has(h.exerciseId) || 
        (h.exerciseName && groupExerciseNames.has(h.exerciseName))
      ))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    if (lastCompleted) {
      // Try matching by ID first, then by name
      let lastIndex = group.exercises.findIndex(e => e.id === lastCompleted.exerciseId);
      if (lastIndex === -1 && lastCompleted.exerciseName) {
        lastIndex = group.exercises.findIndex(e => e.name === lastCompleted.exerciseName);
      }
      const nextIndex = (lastIndex + 1) % group.exercises.length;
      activeRotations[group.id] = group.exercises[nextIndex].id;
    } else {
      activeRotations[group.id] = group.exercises[0].id;
    }
  }

  return activeRotations;
}

// === LEGACY: old per-exercise rotation ===
function computeActiveRotationsLegacy(program: Program, history: WorkoutHistory[]): Record<string, string> {
  const activeRotations: Record<string, string> = {};
  const rotationGroups = new Set<string>();
  
  for (const session of program.sessions) {
    for (const exercise of session.exercises) {
      if (exercise.rotationGroup) {
        rotationGroups.add(exercise.rotationGroup);
      }
    }
  }

  for (const groupId of rotationGroups) {
    const exercises = getRotationGroupExercises(program, groupId);
    if (exercises.length === 0) continue;

    const groupExerciseIds = new Set(exercises.map(e => e.id));
    const lastCompleted = history
      .filter(h => h.programId === program.id && groupExerciseIds.has(h.exerciseId))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    if (lastCompleted) {
      const lastIndex = exercises.findIndex(e => e.id === lastCompleted.exerciseId);
      const nextIndex = (lastIndex + 1) % exercises.length;
      activeRotations[groupId] = exercises[nextIndex].id;
    } else {
      activeRotations[groupId] = exercises[0].id;
    }
  }

  return activeRotations;
}

function computeActiveRotations(program: Program, history: WorkoutHistory[]): Record<string, string> {
  return {
    ...computeActiveRotationsLegacy(program, history),
    ...computeActiveRotationsNew(program, history),
  };
}

// Resolve a rotation slot exercise to the active exercise from the group config
function resolveRotationSlot(
  exercise: Exercise,
  program: Program,
  activeRotations: Record<string, string>
): Exercise | null {
  if (!exercise.rotationGroupRef) return exercise;

  const group = program.rotationGroups?.find(g => g.id === exercise.rotationGroupRef);
  if (!group || group.exercises.length === 0) return null;

  const activeId = activeRotations[group.id];
  const activeExercise = activeId
    ? group.exercises.find(e => e.id === activeId)
    : group.exercises[0];

  if (!activeExercise) return null;

  // Return as a full Exercise, keeping the slot's id for tracking but using the rotation exercise's data
  return {
    ...exercise,
    name: activeExercise.name,
    sets: activeExercise.sets.map(s => ({ ...s, isCompleted: false })),
    mode: activeExercise.mode,
    notes: activeExercise.notes,
    // Store the resolved exercise id for history tracking
    _resolvedExerciseId: activeExercise.id,
  } as Exercise & { _resolvedExerciseId: string };
}

export function useWorkoutData() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`${API_URL}/api/data`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setPrograms(data.programs || []);
          setHistory(data.history || []);
          setActiveWorkout(data.activeWorkout || null);
        }
      } catch (error) {
        console.error('Failed to load data from server:', error);
        const savedPrograms = localStorage.getItem('workout_programs');
        const savedHistory = localStorage.getItem('workout_history');
        const savedActiveWorkout = localStorage.getItem('active_workout');
        if (savedPrograms) setPrograms(JSON.parse(savedPrograms));
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedActiveWorkout) setActiveWorkout(JSON.parse(savedActiveWorkout));
      }
      setIsLoaded(true);
    }
    loadData();
  }, []);

  const saveToServer = useCallback(async (data: { programs: Program[]; history: WorkoutHistory[]; activeWorkout: ActiveWorkout | null }) => {
    try {
      await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to save data to server:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer({ programs, history, activeWorkout });
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [programs, history, activeWorkout, isLoaded, saveToServer]);

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
    const program = programs.find(p => p.id === programId);
    const activeRotations = program ? computeActiveRotations(program, history) : {};
    
    setActiveWorkout({
      programId,
      sessionId,
      startedAt: new Date().toISOString(),
      currentExerciseIndex: 0,
      completedSets: {},
      activeRotations,
    });
  }, [programs, history]);

  const updateActiveWorkout = useCallback((updates: Partial<ActiveWorkout>) => {
    setActiveWorkout(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const completeSet = useCallback((
    exerciseId: string,
    setId: string,
    completedSet: WorkoutSet,
    exerciseName?: string,
    setIndex?: number
  ) => {
    if (!activeWorkout) return;

    setActiveWorkout(prev => prev ? {
      ...prev,
      completedSets: {
        ...prev.completedSets,
        [`${exerciseId}-${setId}`]: completedSet,
      },
    } : null);

    const historyEntry: WorkoutHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      programId: activeWorkout.programId,
      sessionId: activeWorkout.sessionId,
      exerciseId,
      exerciseName,
      setId,
      reps: completedSet.completedReps || 0,
      weight: completedSet.completedWeight || 0,
      duration: completedSet.completedDuration,
      setType: completedSet.type,
      rpe: completedSet.rpe,
      completedAt: new Date().toISOString(),
      setIndex,
      ...(completedSet.myoRestPauseCount ? { myoRestPauseCount: completedSet.myoRestPauseCount } : {}),
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
    setId: string,
    setType?: SetType,
    exerciseName?: string,
    setIndex?: number
  ): WorkoutHistory | undefined => {
    // Exclude entries from the current active session to avoid comparing with sets just completed
    const cutoff = activeWorkout?.startedAt ? new Date(activeWorkout.startedAt).getTime() : null;
    const filtered = cutoff
      ? history.filter(h => new Date(h.completedAt).getTime() < cutoff)
      : history;

    // Try exact match first
    const exact = filtered
      .filter(h =>
        h.programId === programId &&
        h.exerciseId === exerciseId &&
        h.setId === setId &&
        (!exerciseName || !h.exerciseName || h.exerciseName === exerciseName) &&
        (!setType || (h.setType || "force") === setType)
      )
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    if (exact) return exact;

    // For rotation exercises or replaced exercises: match by name (cross-session, any program)
    if (exerciseName) {
      // Try same program + same setIndex first (most accurate prediction)
      if (setIndex != null) {
        const sameProgIdx = filtered
          .filter(h =>
            h.programId === programId &&
            h.exerciseName === exerciseName &&
            h.setIndex === setIndex &&
            (!setType || (h.setType || "force") === setType)
          )
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
        if (sameProgIdx) return sameProgIdx;
      }

      // Same program, any set index
      const sameProg = filtered
        .filter(h =>
          h.programId === programId &&
          h.exerciseName === exerciseName &&
          (!setType || (h.setType || "force") === setType)
        )
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
      if (sameProg) return sameProg;

      // Cross-program fallback: prefer matching setIndex
      if (setIndex != null) {
        const crossIdx = filtered
          .filter(h =>
            h.exerciseName === exerciseName &&
            h.setIndex === setIndex &&
            (!setType || (h.setType || "force") === setType)
          )
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
        if (crossIdx) return crossIdx;
      }

      // Cross-program, any set index
      return filtered
        .filter(h =>
          h.exerciseName === exerciseName &&
          (!setType || (h.setType || "force") === setType)
        )
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    }

    // Ultimate fallback: try exerciseId across any program
    const anyProgram = filtered
      .filter(h => h.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    if (anyProgram) return anyProgram;

    return undefined;
  }, [history, activeWorkout]);

  // Check if an exercise should be shown (considering legacy rotation)
  const isExerciseActive = useCallback((exercise: Exercise): boolean => {
    // New system: rotationGroupRef slots are always shown (they get resolved)
    if (exercise.rotationGroupRef) return true;
    // Legacy system
    if (!exercise.rotationGroup || !activeWorkout?.activeRotations) return true;
    return activeWorkout.activeRotations[exercise.rotationGroup] === exercise.id;
  }, [activeWorkout]);

  // Resolve rotation slots for a session's exercises
  const resolveExercises = useCallback((exercises: Exercise[]): Exercise[] => {
    if (!activeWorkout) return exercises;
    const program = programs.find(p => p.id === activeWorkout.programId);
    if (!program) return exercises;

    return exercises
      .map(ex => resolveRotationSlot(ex, program, activeWorkout.activeRotations || {}))
      .filter((ex): ex is Exercise => ex !== null);
  }, [activeWorkout, programs]);

  return {
    programs,
    history,
    activeWorkout,
    isLoaded,
    addProgram,
    updateProgram,
    deleteProgram,
    startWorkout,
    updateActiveWorkout,
    completeSet,
    endWorkout,
    getLastPerformance,
    isExerciseActive,
    resolveExercises,
  };
}
