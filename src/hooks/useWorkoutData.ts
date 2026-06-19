import { useState, useEffect, useCallback, useRef } from 'react';
import { Program, WorkoutHistory, ActiveWorkout, WorkoutSet, Exercise, RotationGroupConfig, SetType } from '@/types/workout';
import { API_URL } from '@/config';

function sanitizeProgram(p: Program): Program {
  const cleanSets = (sets: WorkoutSet[] | undefined) => (sets || []).map(s => {
    const { isCompleted: _ic, completedReps: _cr, completedWeight: _cw, completedDuration: _cd, rpe: _rpe, myoRestPauseCount: _mrp, ...rest } = s;
    return rest as WorkoutSet;
  });
  return {
    ...p,
    sessions: (p.sessions || []).map(s => ({
      ...s,
      exercises: (s.exercises || []).map(e => ({ ...e, sets: cleanSets(e.sets) })),
    })),
    rotationGroups: (p.rotationGroups || []).map(rg => ({
      ...rg,
      exercises: (rg.exercises || []).map(e => ({ ...e, sets: cleanSets(e.sets) })),
    })),
  };
}

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
      // One-shot cleanup of legacy snapshot (no longer used)
      try { localStorage.removeItem('lift_data_snapshot'); } catch { /* ignore */ }
      // Server is the single source of truth. localStorage was dropped because
      // stale snapshots overwrote fresh server state on reload (42-entry data loss
      // observed 2026-05-26). Resume-where-you-left-off relies on activeWorkout
      // being persisted server-side after each set validation (~500ms debounce).
      let serverData: any = null;
      try {
        const response = await fetch(`${API_URL}/api/data`, { credentials: 'include' });
        if (response.ok) serverData = await response.json();
      } catch (error) {
        console.error('Failed to load data from server:', error);
      }

      if (serverData) {
        setPrograms((serverData.programs || []).map(sanitizeProgram));
        setHistory(serverData.history || []);
        setActiveWorkout(serverData.activeWorkout || null);
      }
      setIsLoaded(true);
    }
    loadData();
  }, []);

  const saveToServer = useCallback(async (data: { programs: Program[]; history: WorkoutHistory[]; activeWorkout: ActiveWorkout | null }) => {
    const cleanData = { ...data, programs: data.programs.map(sanitizeProgram) };
    const stamped = { ...cleanData, lastSavedAt: new Date().toISOString() };
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
    setPrograms(prev => [...prev, sanitizeProgram(program)]);
  }, []);

  const updateProgram = useCallback((program: Program) => {
    setPrograms(prev => prev.map(p => p.id === program.id ? sanitizeProgram(program) : p));
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

  // Match historique STRICTEMENT par (exerciseName, setType, setIndex).
  //
  // Spec (confirmée 2026-05-26) :
  //  - Lookup uniquement par exerciseName + setType + setIndex (`===` strict).
  //  - exerciseId N'EST PLUS utilisé pour le matching nominal — il est trop
  //    instable (slots de rotation, remplacements, ré-création via picker)
  //    et provoquait des mismatchs visibles (ex: 120kg horizontal pull qui
  //    récupérait 66kg d'un autre exo via un id partagé).
  //  - Même nom dans plusieurs programmes/sessions : ignoré, on prend la
  //    perf la plus récente tous programmes/sessions confondus.
  //
  // Fallback legacy strict : si TOUTES les entrées d'historique pour cet
  // exerciseId n'ont pas d'exerciseName (anciennes données pré-fix), on
  // autorise un fallback par exerciseId pour ne pas perdre l'affichage de
  // l'historique existant. Dès qu'il existe au moins une entrée avec
  // exerciseName, ce fallback est désactivé.
  //
  // Les paramètres _programId, _sessionId et _setId sont conservés dans la
  // signature pour compat des call sites mais ne sont pas utilisés.
  const getLastPerformance = useCallback((
    _programId: string,
    _sessionId: string,
    exerciseId: string,
    _setId: string,
    setType?: SetType,
    exerciseName?: string,
    setIndex?: number
  ): WorkoutHistory | undefined => {
    // Exclure les entrées validées DEPUIS le début de la séance en cours
    // (un set juste validé ne doit pas devenir sa propre "perf précédente").
    const cutoff = activeWorkout?.startedAt ? new Date(activeWorkout.startedAt).getTime() : null;
    const filtered = cutoff
      ? history.filter(h => new Date(h.completedAt).getTime() < cutoff)
      : history;

    // 1) Match par NOM exact (trim côté caller — pas de normalisation ici).
    //    Si pas de nom fourni : on n'a aucune clé fiable, on tombe direct sur
    //    le fallback legacy id-based.
    let candidates: WorkoutHistory[];
    if (exerciseName) {
      candidates = filtered.filter(h => h.exerciseName === exerciseName);
      // Fallback legacy : aucune entrée nommée pour ce nom → on essaie l'id
      // mais UNIQUEMENT sur des entrées sans exerciseName (vrais legacy).
      if (candidates.length === 0) {
        candidates = filtered.filter(h => !h.exerciseName && h.exerciseId === exerciseId);
      }
    } else {
      candidates = filtered.filter(h => !h.exerciseName && h.exerciseId === exerciseId);
    }
    if (candidates.length === 0) return undefined;

    // 2) Filtrage par setType. Si setType demandé mais aucun match exact,
    //    on retombe sur la pool entière (couvre les anciennes mistags).
    const sameType = setType
      ? candidates.filter(h => (h.setType || 'force') === setType)
      : candidates;
    const pool = sameType.length > 0 ? sameType : candidates;

    // Tri date desc.
    const sorted = [...pool].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    if (setIndex == null) return sorted[0];

    // Regroupe les entrées de la session source de la perf la plus récente.
    // On accepte "même sessionId" OU fenêtre 4h pour les cas legacy où
    // sessionId pourrait être différent mais la séance est manifestement la
    // même (ex: replay/imports). Tous programmes/sessions confondus sinon.
    const mostRecent = sorted[0];
    const mostRecentTime = new Date(mostRecent.completedAt).getTime();
    const sessionWindow = 4 * 60 * 60 * 1000;
    const lastSessionEntries = sorted.filter(h =>
      h.sessionId === mostRecent.sessionId
      && mostRecentTime - new Date(h.completedAt).getTime() < sessionWindow
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

  // Retourne toutes les séries (Map<setIndex, perf>) de la DERNIÈRE occurrence
  // de cette même séance (même programId + sessionId) pour cet exo.
  // Utilisé pour la frise comparaison: voir l intégralité de la session n-1
  // côte à côte avec celle en cours.
  // Fenêtre de regroupement: 4h autour de l entrée la plus récente, dans la
  // même séance définition (sessionId stable, pas la même date).
  const getPreviousSessionForExercise = useCallback((
    programId: string,
    sessionId: string,
    exerciseName: string,
  ): Map<number, WorkoutHistory> => {
    const result = new Map<number, WorkoutHistory>();
    if (!exerciseName) return result;
    const cutoff = activeWorkout?.startedAt ? new Date(activeWorkout.startedAt).getTime() : null;
    const candidates = history.filter(h =>
      h.programId === programId
      && h.sessionId === sessionId
      && h.exerciseName === exerciseName
      && (!cutoff || new Date(h.completedAt).getTime() < cutoff)
    );
    if (candidates.length === 0) return result;
    const sorted = [...candidates].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const mostRecent = sorted[0];
    const mostRecentTime = new Date(mostRecent.completedAt).getTime();
    const window = 4 * 60 * 60 * 1000;
    const sessionEntries = sorted.filter(h =>
      mostRecentTime - new Date(h.completedAt).getTime() < window
    );
    for (const e of sessionEntries) {
      const idx = e.setIndex;
      if (typeof idx !== 'number') continue;
      // Si plusieurs entrées au même setIndex (replay/correction), garder la plus récente
      const existing = result.get(idx);
      if (!existing || new Date(e.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
        result.set(idx, e);
      }
    }
    return result;
  }, [history, activeWorkout]);

  // Migrate all history entries with exerciseName === oldName to newName.
  // Used when the user confirms a rename (vs replacement) via the
  // RenameOrReplaceDialog. Idempotent: a no-op if no entry matches oldName.
  const migrateHistoryExerciseName = useCallback((oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;
    setHistory(prev => prev.map(h =>
      h.exerciseName === oldName ? { ...h, exerciseName: newName } : h
    ));
  }, []);

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
    getPreviousSessionForExercise,
    migrateHistoryExerciseName,
    isExerciseActive,
    resolveExercises,
  };
}
