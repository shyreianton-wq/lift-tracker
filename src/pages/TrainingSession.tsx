import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExercisePicker } from '@/components/ExercisePicker';
import { SessionHeader } from '@/components/training/SessionHeader';
import { ExerciseHeader } from '@/components/training/ExerciseHeader';
import { SeriesPills } from '@/components/training/SeriesPills';
import { SupersetBanner } from '@/components/training/SupersetBanner';
import { SetInputPanel } from '@/components/training/SetInputPanel';
import { BottomActions } from '@/components/training/BottomActions';
import { RestOverlay } from '@/components/training/RestOverlay';
import { useState, useMemo, useCallback } from "react";
import { WorkoutSet, Exercise, ExerciseMode, SetType } from '@/types/workout';
import { RenameOrReplaceDialog } from '@/components/RenameOrReplaceDialog';
import { hasHistoryForExerciseName, isExerciseNameKnown } from '@/lib/exercise-utils';

// Navigation step: single exercise or a superset pair
interface NavStep {
  type: 'single' | 'superset';
  exercises: Exercise[];
}

// Exercise carries an optional `_historyId` after resolution.
// We avoid `any` and type the augmented fields explicitly.
type ResolvedExercise = Exercise & { _historyId?: string; _resolvedExerciseId?: string };

export default function TrainingSession() {
  const { programId, sessionId } = useParams();
  const navigate = useNavigate();
  const {
    programs, history, activeWorkout,
    completeSet, endWorkout, getLastPerformance,
    updateProgram, resolveExercises, updateActiveWorkout,
    migrateHistoryExerciseName,
  } = useWorkout();

  // ===== Local state (transient session state) =====
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [restOpen, setRestOpen] = useState(false);
  const [exerciseSets, setExerciseSets] = useState<Record<string, Record<string, WorkoutSet>>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [supersetActiveIdx, setSupersetActiveIdx] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState<string | null>(null); // exerciseId or 'new'
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // ===== Persisted in activeWorkout (survives refresh, cleared on endWorkout) =====
  const exerciseOverrides = activeWorkout?.exerciseOverrides || {};
  const addedExercises = activeWorkout?.addedExercises || [];
  const addedSets = activeWorkout?.addedSets || {};

  const program = programs.find(p => p.id === programId);
  const session = program?.sessions.find(s => s.id === sessionId);

  // ===== Build the live exercise list with overrides, added sets, added exercises =====
  const exercises = useMemo<ResolvedExercise[]>(() => {
    if (!session) return [];
    const resolved = resolveExercises(session.exercises);
    const base: ResolvedExercise[] = resolved.map(ex => {
      const override = exerciseOverrides[ex.id];
      const extra = addedSets[ex.id] || [];
      const allSets = [...ex.sets, ...extra];
      return {
        ...ex,
        ...(override ? { name: override.name, _historyId: override.historyId } : {}),
        sets: allSets.map(set => exerciseSets[ex.id]?.[set.id] || set),
      };
    });
    // Append exercises added during session
    const added: ResolvedExercise[] = addedExercises.map(ex => {
      const extra = addedSets[ex.id] || [];
      const allSets = [...ex.sets, ...extra];
      return {
        ...ex,
        sets: allSets.map(set => exerciseSets[ex.id]?.[set.id] || set),
      };
    });
    return [...base, ...added];
  }, [session, exerciseSets, resolveExercises, exerciseOverrides, addedExercises, addedSets]);

  // ===== Group exercises into nav steps (handle supersets as pairs) =====
  const navSteps: NavStep[] = useMemo(() => {
    const steps: NavStep[] = [];
    let i = 0;
    while (i < exercises.length) {
      const ex = exercises[i];
      if (ex.supersetPairId && i + 1 < exercises.length && exercises[i + 1].supersetPairId === ex.supersetPairId) {
        steps.push({ type: 'superset', exercises: [exercises[i], exercises[i + 1]] });
        i += 2;
      } else {
        steps.push({ type: 'single', exercises: [ex] });
        i += 1;
      }
    }
    return steps;
  }, [exercises]);

  const currentStep = navSteps[currentStepIndex];

  // ===== Rest timer duration based on the upcoming set's type =====
  const getTimerDuration = useCallback((setType: string | undefined): number => {
    if (setType === 'myo-rep') return 15;
    if (setType === 'force') return 180;
    return 60; // hypertrophie + tout le reste
  }, []);

  const timerDuration = useMemo(() => {
    if (!currentStep) return 120;
    if (currentStep.type === 'superset') {
      const setType = currentStep.exercises[1]?.sets[0]?.type;
      return getTimerDuration(setType);
    }
    const setType = currentStep.exercises[0]?.sets[0]?.type;
    return getTimerDuration(setType);
  }, [currentStep, getTimerDuration]);

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0);
  const progress = totalSets > 0 ? (completedSetsCount / totalSets) * 100 : 0;
  const allSetsCompleted = completedSetsCount === totalSets && totalSets > 0;

  // ===== Active exercise/set within the current step =====
  const activeExercise = currentStep?.type === 'superset'
    ? currentStep.exercises[supersetActiveIdx]
    : currentStep?.exercises[0];

  const activeSetIndex = activeExercise
    ? activeExercise.sets.findIndex(s => !s.isCompleted && !exerciseSets[activeExercise.id]?.[s.id]?.isCompleted)
    : -1;
  const activeSet = activeExercise && activeSetIndex >= 0 ? activeExercise.sets[activeSetIndex] : null;

  // ===== Progression score for the current exercise (vs last performance) =====
  const computeProgression = (exercise: ResolvedExercise) => {
    let currentTotal = 0;
    let previousTotal = 0;
    let hasPrevious = false;

    const computeScore = (weight: number, reps: number, _rpe?: number, duration?: number) => {
      if (exercise.mode === 'time') return (duration || 0) + (weight || 0) * 0.1;
      if (weight === 0) return reps;
      return weight * reps;
    };

    for (const set of exercise.sets) {
      const resolvedId = exercise._historyId || exercise._resolvedExerciseId || exercise.id;
      const setIdx = exercise.sets.indexOf(set) + 1;
      const prev = getLastPerformance(program!.id, session!.id, resolvedId, set.id, set.type, exercise.name, setIdx);
      if (prev) {
        hasPrevious = true;
        previousTotal += computeScore(prev.weight, prev.reps, prev.rpe, prev.duration);
        const hasInput = set.completedWeight != null || set.completedReps != null || set.completedDuration != null;
        if (set.isCompleted || hasInput) {
          currentTotal += computeScore(set.completedWeight ?? prev.weight, set.completedReps ?? prev.reps, set.rpe ?? prev.rpe, set.completedDuration ?? prev.duration);
        } else {
          currentTotal += computeScore(prev.weight, prev.reps, prev.rpe, prev.duration);
        }
      }
    }
    if (!hasPrevious || previousTotal === 0) return null;
    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  };

  // ===== All known exercise names for the picker (programs + history) =====
  const allExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of programs) {
      for (const s of p.sessions) {
        for (const e of s.exercises) {
          names.add(e.name);
        }
      }
      for (const rg of p.rotationGroups || []) {
        for (const e of rg.exercises) {
          names.add(e.name);
        }
      }
    }
    for (const h of history) {
      if (h.exerciseName) names.add(h.exerciseName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [programs, history]);

  // ===== Pending rename intent (in-session) =====
  // When the user types a brand-new exercise name in the picker AND the
  // current slot's name has logged history, we don't know if they meant
  // "rename" (migrate history) or "replacement" (start fresh).
  const [pendingInSessionRename, setPendingInSessionRename] = useState<{
    slotId: string;
    oldName: string;
    newName: string;
  } | null>(null);

  // ===== Replace an exercise in the current session =====
  // historyId rules:
  //   - isNew=true  → always a freshly minted id (brand-new exercise, no inheritance).
  //   - isNew=false → use the program/rotationGroup exercise id if a real
  //                   programmed exercise matches `newName`.
  //                   If the name is only known via history (no real programmed
  //                   exercise), also mint a fresh id so we don't fall back to
  //                   the old slot id and contaminate the new performance series.
  const doReplaceSlot = useCallback((slotId: string, newName: string, isNew: boolean) => {
    const freshId = () => `repl-${slotId}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    let historyId: string | undefined;
    if (!isNew) {
      for (const p of programs) {
        for (const s of p.sessions) {
          const match = s.exercises.find(e => e.name === newName);
          if (match) { historyId = match.id; break; }
        }
        if (historyId) break;
        for (const rg of p.rotationGroups || []) {
          const match = rg.exercises.find(e => e.name === newName);
          if (match) { historyId = match.id; break; }
        }
        if (historyId) break;
      }
    }
    if (!historyId) historyId = freshId();
    updateActiveWorkout({ exerciseOverrides: { ...(activeWorkout?.exerciseOverrides || {}), [slotId]: { name: newName, historyId } } });
    // Reset les inputs non-validés du slot pour que SetInput auto-fill depuis la lastPerformance du nouvel exo
    setExerciseSets(prev => {
      const slot = prev[slotId];
      if (!slot) return prev;
      const cleaned: Record<string, WorkoutSet> = {};
      for (const [setId, s] of Object.entries(slot)) {
        if (s.isCompleted) {
          cleaned[setId] = s;
        } else {
          const { completedWeight: _cw, completedReps: _cr, completedDuration: _cd, rpe: _rpe, ...rest } = s;
          cleaned[setId] = { ...rest, isCompleted: false };
        }
      }
      return { ...prev, [slotId]: cleaned };
    });
  }, [programs, activeWorkout, updateActiveWorkout]);

  const handleReplaceExercise = (slotId: string, newName: string, isNew: boolean) => {
    // Look up the current name of the slot — accounting for any in-session
    // override that may already have changed it.
    const slot = exercises.find(e => e.id === slotId);
    const overrideName = activeWorkout?.exerciseOverrides?.[slotId]?.name;
    const oldName = overrideName || slot?.name;

    // Branche dialog : nom totalement nouveau (isNew=true), différent de
    // l'actuel, l'actuel a un historique loggé sous son nom, et le nouveau
    // nom n'apparaît ni en historique ni dans aucun programme connu.
    const newNameKnown = isExerciseNameKnown(history, programs, newName);
    if (
      isNew
      && oldName
      && oldName !== newName
      && hasHistoryForExerciseName(history, oldName)
      && !newNameKnown
    ) {
      setPendingInSessionRename({ slotId, oldName, newName });
      return;
    }

    doReplaceSlot(slotId, newName, isNew);
  };

  const confirmInSessionAsRename = () => {
    if (!pendingInSessionRename) return;
    const { slotId, oldName, newName } = pendingInSessionRename;
    // Migrate ALL past entries from oldName → newName so the new label
    // immediately surfaces the existing performance series.
    migrateHistoryExerciseName(oldName, newName);
    // After migration the name now exists in history → treat as known
    // (not "isNew") so we don't mint a brand-new historyId unnecessarily.
    doReplaceSlot(slotId, newName, /* isNew */ false);
    setPendingInSessionRename(null);
  };

  const confirmInSessionAsReplacement = () => {
    if (!pendingInSessionRename) return;
    const { slotId, newName } = pendingInSessionRename;
    doReplaceSlot(slotId, newName, /* isNew */ true);
    setPendingInSessionRename(null);
  };

  const pendingInSessionHistoryCount = useMemo(() => {
    if (!pendingInSessionRename) return 0;
    return history.filter(h => h.exerciseName === pendingInSessionRename.oldName).length;
  }, [history, pendingInSessionRename]);

  // ===== Add a set to an exercise =====
  const handleAddSet = (exerciseId: string) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `added-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: lastSet?.type || 'force',
      targetReps: lastSet?.targetReps || 8,
      targetWeight: lastSet?.targetWeight || 0,
      targetDuration: lastSet?.targetDuration,
      isCompleted: false,
    };
    const prev = activeWorkout?.addedSets || {};
    updateActiveWorkout({ addedSets: { ...prev, [exerciseId]: [...(prev[exerciseId] || []), newSet] } });
  };

  // ===== Add a brand new exercise to the session =====
  const handleAddExercise = (name: string) => {
    const lastEx = exercises[exercises.length - 1];
    const setType = lastEx?.sets[0]?.type || 'force';
    const newEx: Exercise = {
      id: `added-ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      mode: 'reps',
      sets: [
        { id: `s1-${Date.now()}`, type: setType, targetReps: 8, targetWeight: 0, isCompleted: false },
        { id: `s2-${Date.now()}`, type: setType, targetReps: 8, targetWeight: 0, isCompleted: false },
      ],
    };
    updateActiveWorkout({ addedExercises: [...(activeWorkout?.addedExercises || []), newEx] });
  };

  if (!program || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Séance introuvable</p>
          <Button variant="secondary" onClick={() => navigate('/')}>Retour</Button>
        </div>
      </div>
    );
  }

  // ===== Set update / complete handlers =====
  const handleSetUpdate = (exerciseId: string, setId: string, set: WorkoutSet) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [setId]: set },
    }));
  };

  const handleExerciseUpdate = (updatedExercise: Exercise) => {
    if (!program || !session) return;
    // Strip in-progress workout state from sets so it does not bleed into the program template
    const cleanExercise = {
      ...updatedExercise,
      sets: updatedExercise.sets.map(({ isCompleted: _ic, completedReps: _cr, completedWeight: _cw, completedDuration: _cd, rpe: _rpe, myoRestPauseCount: _mrp, ...rest }) => ({ ...rest, isCompleted: false })),
    };
    const updatedProgram = {
      ...program,
      sessions: program.sessions.map(s =>
        s.id !== session.id ? s : {
          ...s,
          exercises: s.exercises.map(e => e.id !== updatedExercise.id ? e : cleanExercise),
        }
      ),
    };
    updateProgram(updatedProgram);
  };

  // ===== Ouverture du rest overlay + auto-RPE myo-rep =====
  // Centralise: tout démarrage de repos (manuel via header OU auto après validate)
  // passe par ici. Pour les exos myo-rep, ça incrémente le myoRestPauseCount du
  // set en cours (chaque mini-pause compte) et ajuste le RPE en conséquence.
  const openRest = () => {
    setRestOpen(true);
    if (!currentStep) return;
    const ex = currentStep.type === 'superset' ? currentStep.exercises[supersetActiveIdx] : currentStep.exercises[0];
    if (!ex || ex.sets[0]?.type !== 'myo-rep') return;
    const completedCount = ex.sets.filter(s => s.isCompleted || !!exerciseSets[ex.id]?.[s.id]?.isCompleted).length;
    if (completedCount < 1) return;
    const aSet = ex.sets[completedCount];
    if (!aSet) return;
    const currentCount = (exerciseSets[ex.id]?.[aSet.id]?.myoRestPauseCount || aSet.myoRestPauseCount || 0) + 1;
    const autoRpe = currentCount <= 3 ? 6.5 : currentCount <= 5 ? 7.5 : currentCount <= 7 ? 8.5 : 10;
    handleSetUpdate(ex.id, aSet.id, { ...(exerciseSets[ex.id]?.[aSet.id] || aSet), myoRestPauseCount: currentCount, rpe: autoRpe });
  };

  const handleSetComplete = (exerciseId: string, setId: string, set: WorkoutSet, exerciseName?: string) => {
    handleSetUpdate(exerciseId, setId, set);
    // Compute 1-based setIndex from the exercise's sets array
    const matchedExercise = exercises.find(ex => ex.id === exerciseId);
    const setIdx = matchedExercise ? matchedExercise.sets.findIndex(s => s.id === setId) + 1 : undefined;
    // Use the real exercise ID for history (important for replacements)
    const historyExerciseId = matchedExercise?._historyId || matchedExercise?._resolvedExerciseId || exerciseId;
    completeSet(historyExerciseId, setId, set, exerciseName, setIdx);

    if (!currentStep) return;

    if (currentStep.type === 'superset') {
      const [exA, exB] = currentStep.exercises;
      if (exerciseId === exA.id) {
        setSupersetActiveIdx(1);
      } else if (exerciseId === exB.id) {
        setTimerKey(k => k + 1); openRest();
        const allADone = exA.sets.every(s => (s.id === setId && exerciseId === exA.id) || s.isCompleted || !!exerciseSets[exA.id]?.[s.id]?.isCompleted);
        const allBDone = exB.sets.every(s => s.id === setId || s.isCompleted || !!exerciseSets[exB.id]?.[s.id]?.isCompleted);
        if (allADone && allBDone && currentStepIndex < navSteps.length - 1) {
          setTimeout(() => { setCurrentStepIndex(i => i + 1); setSupersetActiveIdx(0); }, 500);
        } else {
          setSupersetActiveIdx(0);
        }
      }
    } else {
      setTimerKey(k => k + 1); openRest();
      const ex = currentStep.exercises[0];
      if (exerciseId === ex.id) {
        const allDone = ex.sets.every(s => s.id === setId || s.isCompleted || !!exerciseSets[ex.id]?.[s.id]?.isCompleted);
        if (allDone && currentStepIndex < navSteps.length - 1) {
          setTimeout(() => setCurrentStepIndex(i => i + 1), 500);
        }
      }
    }
  };

  const handleEndWorkout = () => { endWorkout(); navigate('/'); };
  const goNext = () => { if (currentStepIndex < navSteps.length - 1) { setCurrentStepIndex(i => i + 1); setSupersetActiveIdx(0); } };
  const goPrev = () => { if (currentStepIndex > 0) { setCurrentStepIndex(i => i - 1); setSupersetActiveIdx(0); } };

  const getLastPerfForExercise = (exercise: ResolvedExercise, setId: string, setIndex?: number) => {
    const matchingSet = exercise.sets.find(s => s.id === setId);
    const resolvedId = exercise._historyId || exercise._resolvedExerciseId || exercise.id;
    const perf = getLastPerformance(program.id, session.id, resolvedId, setId, matchingSet?.type, exercise.name, setIndex);
    return perf ? { reps: perf.reps, weight: perf.weight, rpe: perf.rpe, duration: perf.duration, myoRestPauseCount: perf.myoRestPauseCount, completedAt: perf.completedAt, setType: perf.setType } : undefined;
  };

  // Compute personal best (max weight*reps) for an exercise + setType from history.
  // Same rule as getLastPerformance: prefer entries matching exerciseName.
  // Fall back to exerciseId only for legacy entries with no exerciseName, so a
  // replaced/new exercise that reuses the slot id does NOT pick up the old PR.
  const getPersonalBest = (exercise: ResolvedExercise, setType?: string) => {
    const resolvedId = exercise._historyId || exercise._resolvedExerciseId || exercise.id;
    const byName = history.filter(h => h.exerciseName === exercise.name);
    const pool = byName.length > 0
      ? byName
      : history.filter(h => !h.exerciseName && h.exerciseId === resolvedId);
    let best: { weight: number; reps: number; score: number } | undefined;
    for (const h of pool) {
      if (setType && (h.setType || 'force') !== setType) continue;
      const w = h.weight || 0;
      const r = h.reps || 0;
      const score = w * r;
      if (!best || score > best.score) best = { weight: w, reps: r, score };
    }
    return best;
  };

  const exProgression = activeExercise ? computeProgression(activeExercise) : null;

  // Remaining exercises after current
  const remainingSteps = navSteps.slice(currentStepIndex + 1);

  // ===== Top-row toggles for current exercise =====
  const handleToggleMode = () => {
    if (!activeExercise) return;
    const newMode: ExerciseMode = activeExercise.mode === 'time' ? 'reps' : 'time';
    handleExerciseUpdate({ ...activeExercise, mode: newMode });
  };

  const handleToggleType = () => {
    if (!activeExercise) return;
    const current = activeExercise.sets[0]?.type || 'force';
    const next: SetType = current === 'force' ? 'hypertrophie' : current === 'hypertrophie' ? 'myo-rep' : 'force';
    handleExerciseUpdate({ ...activeExercise, sets: activeExercise.sets.map(s => ({ ...s, type: next })) });
    // Reset inputs non-validés du slot pour que SetInput auto-fill avec la lastPerformance du nouveau type
    setExerciseSets(prev => {
      const slot = prev[activeExercise.id];
      if (!slot) return prev;
      const cleaned: Record<string, WorkoutSet> = {};
      for (const [setId, s] of Object.entries(slot)) {
        if (s.isCompleted) {
          cleaned[setId] = s;
        } else {
          const { completedWeight: _cw, completedReps: _cr, completedDuration: _cd, rpe: _rpe, ...rest } = s;
          cleaned[setId] = { ...rest, type: next, isCompleted: false };
        }
      }
      return { ...prev, [activeExercise.id]: cleaned };
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact sticky header: session + exercise nav + progression */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="container py-2">
          <SessionHeader
            sessionName={session.name}
            completedSetsCount={completedSetsCount}
            totalSets={totalSets}
            progress={progress}
            timerDuration={timerDuration}
            onOpenRest={openRest}
            onRequestQuit={() => setShowCompleteModal(true)}
          />
          <ExerciseHeader
            currentStepIndex={currentStepIndex}
            totalSteps={navSteps.length}
            isSuperset={currentStep?.type === 'superset'}
            supersetActiveIdx={supersetActiveIdx}
            activeExercise={activeExercise}
            exProgression={exProgression}
            onPrev={goPrev}
            onNext={goNext}
            onClickName={() => { if (activeExercise) setShowExercisePicker(activeExercise.id); }}
            onToggleMode={handleToggleMode}
            onToggleType={handleToggleType}
          />
        </div>
      </header>

      <main className="container flex-1 px-4 pt-3 pb-6">
        {currentStep?.type === 'superset' && (
          <SupersetBanner
            exercises={[currentStep.exercises[0], currentStep.exercises[1]]}
            supersetActiveIdx={supersetActiveIdx}
          />
        )}

        {activeExercise && (
          <SeriesPills
            exercise={activeExercise}
            activeSetIndex={activeSetIndex}
            editingSetId={editingSetId}
            exerciseSets={exerciseSets}
            onSelectSet={setEditingSetId}
            onAddSet={handleAddSet}
          />
        )}

        <SetInputPanel
          activeExercise={activeExercise}
          activeSet={activeSet}
          activeSetIndex={activeSetIndex}
          editingSetId={editingSetId}
          hasNextStep={currentStepIndex < navSteps.length - 1}
          onNextStep={goNext}
          onSetUpdate={handleSetUpdate}
          onSetComplete={handleSetComplete}
          onCloseEdit={() => setEditingSetId(null)}
          getLastPerf={getLastPerfForExercise}
          getPersonalBest={getPersonalBest}
        />

        <BottomActions
          remainingSteps={remainingSteps}
          currentStepIndex={currentStepIndex}
          showExerciseList={showExerciseList}
          onToggleExerciseList={() => setShowExerciseList(!showExerciseList)}
          onJumpToStep={(stepIdx, supersetIdx) => {
            setCurrentStepIndex(stepIdx);
            setSupersetActiveIdx(supersetIdx);
            setShowExerciseList(false);
          }}
          onRequestAddExercise={() => setShowExercisePicker('new')}
          allSetsCompleted={allSetsCompleted}
          onEndWorkout={handleEndWorkout}
        />
      </main>

      {/* Exercise Picker modal */}
      <ExercisePicker
        open={showExercisePicker !== null}
        onClose={() => setShowExercisePicker(null)}
        onSelect={(name, isNew) => {
          if (showExercisePicker === 'new') {
            handleAddExercise(name);
          } else if (showExercisePicker) {
            handleReplaceExercise(showExercisePicker, name, isNew);
          }
        }}
        allExerciseNames={allExerciseNames}
        currentName={showExercisePicker && showExercisePicker !== 'new' ? exercises.find(e => e.id === showExercisePicker)?.name : undefined}
      />

      {/* Rename vs Replacement dialog (in-session) */}
      <RenameOrReplaceDialog
        open={pendingInSessionRename !== null}
        oldName={pendingInSessionRename?.oldName || ''}
        newName={pendingInSessionRename?.newName || ''}
        historyEntries={pendingInSessionHistoryCount}
        onRename={confirmInSessionAsRename}
        onReplace={confirmInSessionAsReplacement}
        onCancel={() => setPendingInSessionRename(null)}
      />

      {/* Rest overlay plein écran — déclenché auto à la validation ou via bouton chrono header */}
      <RestOverlay
        open={restOpen}
        durationSec={timerDuration}
        onClose={() => setRestOpen(false)}
        exerciseName={activeExercise?.name}
        setLabel={activeExercise ? `Série ${(activeSetIndex >= 0 ? activeSetIndex : activeExercise.sets.length - 1) + 1}/${activeExercise.sets.length}` : undefined}
        setType={activeExercise?.sets[Math.max(0, activeSetIndex)]?.type}
        previousPerf={(() => {
          if (!activeExercise || activeSetIndex < 0) return undefined;
          const aSet = activeExercise.sets[activeSetIndex];
          if (!aSet) return undefined;
          const perf = getLastPerfForExercise(activeExercise, aSet.id, activeSetIndex + 1);
          return perf ? { weight: perf.weight, reps: perf.reps, rpe: perf.rpe } : undefined;
        })()}
      />

      {/* Quit modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompleteModal(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">Quitter l'entraînement ?</h3>
              <p className="text-muted-foreground mb-6">
                {completedSetsCount > 0
                  ? `${completedSetsCount} séries sur ${totalSets} complétées. Progression sauvegardée.`
                  : "Aucune série enregistrée."}
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCompleteModal(false)}>Continuer</Button>
                <Button variant="destructive" className="flex-1" onClick={handleEndWorkout}>Quitter</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
