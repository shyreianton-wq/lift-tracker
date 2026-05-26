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
      // Try server first
      let serverData: any = null;
      try {
        const response = await fetch(`${API_URL}/api/data`, { credentials: 'include' });
        if (response.ok) serverData = await response.json();
      } catch (error) {
        console.error('Failed to load data from server:', error);
      }
      // Read local snapshot (offline-safe fallback / mid-session backup)
      let localData: any = null;
      try {
        const raw = localStorage.getItem('lift_data_snapshot');
        if (raw) localData = JSON.parse(raw);
      } catch { /* ignore */ }

      // Decide which source wins
      const serverTs = serverData?.lastSavedAt ? new Date(serverData.lastSavedAt).getTime() : 0;
      const localTs = localData?.lastSavedAt ? new Date(localData.lastSavedAt).getTime() : 0;
      const chosen = (!serverData && localData) || (localData && localTs > serverTs) ? localData : serverData;

      if (chosen) {
        setPrograms(chosen.programs || []);
        setHistory(chosen.history || []);
        setActiveWorkout(chosen.activeWorkout || null);
        // If local was more recent than server, push it back so server catches up
        if (chosen === localData && serverData && localTs > serverTs) {
          fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(chosen),
          }).catch(() => {});
        }
      }
      setIsLoaded(true);
    }
    loadData();
  }, []);

  const saveToServer = useCallback(async (data: { programs: Program[]; history: WorkoutHistory[]; activeWorkout: ActiveWorkout | null }) => {
    const stamped = { ...data, lastSavedAt: new Date().toISOString() };
    // Always write-through localStorage first (survives network failure / Safari kill)
    try { localStorage.setItem('lift_data_snapshot', JSON.stringify(stamped)); } catch { /* quota */ }
    try {
      await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(stamped),
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

  // Match historique UNIQUEMENT par (exerciseName, setType, setIndex).
  // Les IDs (exerciseId/setId) ne sont JAMAIS utilisés pour le matching : ils
  // sont instables entre les sessions (slots de rotation, remplacements d'exo,
  // ré-création d'exo via le picker) et provoquaient des mismatchs visibles
  // (ex: 120kg en horizontal pull qui pullait 66kg d'un autre exo via id partagé).
  //
  // Fallback legacy : si une entrée d'historique ne contient pas d'exerciseName
  // (anciennes données pré-fix), on autorise le match par exerciseId pour ne
  // pas casser l'affichage de l'historique existant. Les nouvelles écritures
  // stockent toujours exerciseName + setType + setIndex (voir completeSet).
  const getLastPerformance = useCallback((
    _programId: string,
    _sessionId: string,
    exerciseId: string,
    _setId: string,
    setType?: SetType,
    exerciseName?: string,
    setIndex?: number
  ): WorkoutHistory | undefined => {
    if (!exerciseName) {
      // Sans nom on ne peut plus matcher de façon fiable. On retombe sur
      // l'ancien comportement id-based pour ne rien casser, mais c'est un
      // chemin "best-effort" que les callers normaux ne doivent plus emprunter.
      const cutoff = activeWorkout?.startedAt ? new Date(activeWorkout.startedAt).getTime() : null;
      const filtered = cutoff
        ? history.filter(h => new Date(h.completedAt).getTime() < cutoff)
        : history;
      const candidates = filtered.filter(h => h.exerciseId === exerciseId);
      if (candidates.length === 0) return undefined;
      const pool = setType
        ? (candidates.filter(h => (h.setType || 'force') === setType).length > 0
            ? candidates.filter(h => (h.setType || 'force') === setType)
            : candidates)
        : candidates;
      return [...pool].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    }

    // Exclure les entrées de la session en cours (un set juste validé ne
    // doit pas devenir sa propre "perf précédente").
    const cutoff = activeWorkout?.startedAt ? new Date(activeWorkout.startedAt).getTime() : null;
    const filtered = cutoff
      ? history.filter(h => new Date(h.completedAt).getTime() < cutoff)
      : history;

    // 1) Filtrage par NOM d'exercice (string match exact).
    //    Fallback legacy : entrées sans exerciseName matchées par exerciseId.
    const byName = filtered.filter(h => h.exerciseName === exerciseName);
    const legacy = filtered.filter(h => !h.exerciseName && h.exerciseId === exerciseId);
    const candidates = byName.length > 0 ? byName : legacy;
    if (candidates.length === 0) return undefined;

    // 2) Filtrage par TAG (setType). Si aucun match exact, on retombe sur la
    //    pool entière (couvre les anciennes mistags type "force loggé en hyp").
    const sameType = setType
      ? candidates.filter(h => (h.setType || 'force') === setType)
      : candidates;
    const pool = sameType.length > 0 ? sameType : candidates;

    // Tri date desc — on isole la session la plus récente pour ce nom+type.
    const sorted = [...pool].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    if (setIndex == null) return sorted[0];

    // Regroupe les entrées de la "dernière session" (fenêtre 4h + même sessionId
    // pour les cas où le nom a été utilisé dans plusieurs séances le même jour).
    const mostRecent = sorted[0];
    const mostRecentTime = new Date(mostRecent.completedAt).getTime();
    const sessionWindow = 4 * 60 * 60 * 1000;
    const lastSessionEntries = sorted.filter(h =>
      mostRecentTime - new Date(h.completedAt).getTime() < sessionWindow &&
      h.sessionId === mostRecent.sessionId
    );

    // 3) Match par ORDRE de série (setIndex 1-based) dans la dernière session.
    if (lastSessionEntries.some(h => h.setIndex != null)) {
      const match = lastSessionEntries.find(h => h.setIndex === setIndex);
      if (match) return match;
      // Demande au-delà du nombre de séries connues : retourne la plus haute
      // (ex: 4e série demandée alors que la dernière séance en avait 3).
      const bySI = [...lastSessionEntries].sort((a, b) => (b.setIndex ?? 0) - (a.setIndex ?? 0));
      return bySI[0];
    }

    // Entrées legacy sans setIndex : on infère par ordre chronologique.
    const chronological = [...lastSessionEntries].sort((a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const idx = setIndex - 1;
    return chronological[idx] ?? chronological[chronological.length - 1];
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
