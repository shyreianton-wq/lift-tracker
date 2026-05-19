import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Zap, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Timer } from '@/components/Timer';
import { SetInput } from '@/components/SetInput';
import { useState, useMemo, useCallback } from 'react';
import { WorkoutSet, Exercise } from '@/types/workout';

// Navigation step: single exercise or a superset pair
interface NavStep {
  type: 'single' | 'superset';
  exercises: Exercise[];
}

export default function TrainingSession() {
  const { programId, sessionId } = useParams();
  const navigate = useNavigate();
  const { programs, history, activeWorkout, completeSet, endWorkout, getLastPerformance, updateProgram, resolveExercises, updateActiveWorkout } = useWorkout();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [exerciseSets, setExerciseSets] = useState<Record<string, Record<string, WorkoutSet>>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [supersetActiveIdx, setSupersetActiveIdx] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [showTimer, setShowTimer] = useState(true);
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState<string | null>(null); // exerciseId or 'new'
  // Persisted in activeWorkout (survives refresh/lock-screen, cleared on endWorkout)
  const exerciseOverrides = activeWorkout?.exerciseOverrides || {};
  const addedExercises = activeWorkout?.addedExercises || [];
  const addedSets = activeWorkout?.addedSets || {};
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const program = programs.find(p => p.id === programId);
  const session = program?.sessions.find(s => s.id === sessionId);

  const exercises = useMemo(() => {
    if (!session) return [];
    const resolved = resolveExercises(session.exercises);
    const base = resolved.map(ex => {
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
    const added = addedExercises.map(ex => {
      const extra = addedSets[ex.id] || [];
      const allSets = [...ex.sets, ...extra];
      return {
        ...ex,
        sets: allSets.map(set => exerciseSets[ex.id]?.[set.id] || set),
      };
    });
    return [...base, ...added];
  }, [session, exerciseSets, resolveExercises, exerciseOverrides, addedExercises, addedSets]);

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

  const getTimerDuration = useCallback((setType: string | undefined): number => {
    if (setType === 'myo-rep') return 15;
    if (setType === 'hypertrophie') return 120;
    return 180;
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

  // Current active exercise
  const activeExercise = currentStep?.type === 'superset'
    ? currentStep.exercises[supersetActiveIdx]
    : currentStep?.exercises[0];

  // Active set index for current exercise
  const activeSetIndex = activeExercise
    ? activeExercise.sets.findIndex(s => !s.isCompleted && !exerciseSets[activeExercise.id]?.[s.id]?.isCompleted)
    : -1;
  const activeSet = activeExercise && activeSetIndex >= 0 ? activeExercise.sets[activeSetIndex] : null;

  // Progression calculation
  const computeProgression = (exercise: Exercise) => {
    let currentTotal = 0;
    let previousTotal = 0;
    let hasPrevious = false;

    const computeScore = (weight: number, reps: number, _rpe?: number, duration?: number) => {
      if (exercise.mode === 'time') return (duration || 0) + (weight || 0) * 0.1;
      if (weight === 0) return reps;
      return weight * reps;
    };

    for (const set of exercise.sets) {
      const resolvedId = (exercise as any)._historyId || (exercise as any)._resolvedExerciseId || exercise.id;
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

  // Collect all known exercise names for the picker
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

  // Handle exercise replacement.
  // historyId rules:
  //   - isNew=true  → always a freshly minted id (brand-new exercise, no inheritance).
  //   - isNew=false → use the program/rotationGroup exercise id if a real
  //                   programmed exercise matches `newName`.
  //                   If the name is only known via history (no real programmed
  //                   exercise), also mint a fresh id so we don't fall back to
  //                   the old slot id and contaminate the new performance series.
  const handleReplaceExercise = (slotId: string, newName: string, isNew: boolean) => {
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
  };

  // Handle adding a set to an exercise
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

  // Handle adding a new exercise to the session
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

  const handleTimerStart = () => {
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
    const historyExerciseId = (matchedExercise as any)?._historyId || (matchedExercise as any)?._resolvedExerciseId || exerciseId;
    completeSet(historyExerciseId, setId, set, exerciseName, setIdx);

    if (!currentStep) return;

    if (currentStep.type === 'superset') {
      const [exA, exB] = currentStep.exercises;
      if (exerciseId === exA.id) {
        
        setSupersetActiveIdx(1);
      } else if (exerciseId === exB.id) {
        
        setTimerKey(k => k + 1);
        const allADone = exA.sets.every(s => (s.id === setId && exerciseId === exA.id) || s.isCompleted || !!exerciseSets[exA.id]?.[s.id]?.isCompleted);
        const allBDone = exB.sets.every(s => s.id === setId || s.isCompleted || !!exerciseSets[exB.id]?.[s.id]?.isCompleted);
        if (allADone && allBDone && currentStepIndex < navSteps.length - 1) {
          setTimeout(() => { setCurrentStepIndex(i => i + 1); setSupersetActiveIdx(0); }, 500);
        } else {
          setSupersetActiveIdx(0);
        }
      }
    } else {
      
      setTimerKey(k => k + 1);
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

  const getLastPerfForExercise = (exercise: Exercise, setId: string, setIndex?: number) => {
    const matchingSet = exercise.sets.find(s => s.id === setId);
    const resolvedId = (exercise as any)._historyId || (exercise as any)._resolvedExerciseId || exercise.id;
    const perf = getLastPerformance(program.id, session.id, resolvedId, setId, matchingSet?.type, exercise.name, setIndex);
    return perf ? { reps: perf.reps, weight: perf.weight, rpe: perf.rpe, duration: perf.duration, myoRestPauseCount: perf.myoRestPauseCount, completedAt: perf.completedAt } : undefined;
  };

  // Compute personal best (max weight*reps) for an exercise + setType from history.
  // Same rule as getLastPerformance: prefer entries matching exerciseName.
  // Fall back to exerciseId only for legacy entries with no exerciseName, so a
  // replaced/new exercise that reuses the slot id does NOT pick up the old PR.
  const getPersonalBest = (exercise: Exercise, setType?: string) => {
    const resolvedId = (exercise as any)._historyId || (exercise as any)._resolvedExerciseId || exercise.id;
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact sticky header: session + exercise nav + progression */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="container py-2">
          {/* Row 1: session info + progress circle + close */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCompleteModal(true)}>
                <X className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{session.name} • {completedSetsCount}/{totalSets}</span>
            </div>
            <button
              onClick={() => setShowTimer(prev => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <span className="text-xs">⏱</span>
              <span className="text-xs font-medium text-primary">{timerDuration}s</span>
            </button>
            <div className="w-8 h-8 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <motion.circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  initial={false}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}` }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Row 2: exercise navigation */}
          <div className="flex items-center justify-between">
            <button onClick={goPrev} disabled={currentStepIndex === 0}
              className={`p-1 ${currentStepIndex === 0 ? 'opacity-30' : 'opacity-100'}`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center min-w-0">
              <div className="flex items-center justify-center gap-1.5">
                {currentStep?.type === 'superset' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                    {supersetActiveIdx === 0 ? 'A' : 'B'}
                  </span>
                )}
                <h2
                  className="text-sm font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeExercise) setShowExercisePicker(activeExercise.id);
                  }}
                >{activeExercise?.name}</h2>
                {exProgression !== null && (
                  <span className={`text-xs font-bold ${
                    exProgression > 0 ? 'text-green-400' : exProgression < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    {exProgression > 0 ? '📈+' : exProgression < 0 ? '📉' : '➡️'}{exProgression}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {activeExercise && (
                  <>
                    <button
                      onClick={() => {
                        if (!activeExercise) return;
                        const newMode = activeExercise.mode === 'time' ? 'reps' : 'time';
                        handleExerciseUpdate({ ...activeExercise, mode: newMode as any });
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        activeExercise.mode === 'time' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {activeExercise.mode === 'time' ? '⏱ Temps' : '🔢 Reps'}
                    </button>
                    {activeExercise.mode !== 'time' && (
                      <button
                        onClick={() => {
                          const current = activeExercise.sets[0]?.type || 'force';
                          const next = current === 'force' ? 'hypertrophie' : current === 'hypertrophie' ? 'myo-rep' : 'force';
                          handleExerciseUpdate({ ...activeExercise, sets: activeExercise.sets.map(s => ({ ...s, type: next })) });
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          activeExercise.sets[0]?.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400'
                            : activeExercise.sets[0]?.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {activeExercise.sets[0]?.type === 'myo-rep' ? 'Myo' : activeExercise.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {activeExercise.sets.filter(s => s.isCompleted).length}/{activeExercise.sets.length}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button onClick={goNext} disabled={currentStepIndex === navSteps.length - 1}
              className={`p-1 ${currentStepIndex === navSteps.length - 1 ? 'opacity-30' : 'opacity-100'}`}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Timer - toggled by button */}
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-background border-b border-border"
          >
            <div className="container py-2 flex justify-center">
              <Timer key={`timer-${timerKey}-${timerDuration}`} initialDuration={timerDuration} compact onStart={handleTimerStart} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container flex-1 px-4 pt-3 pb-6">
        {/* Superset indicator */}
        {currentStep?.type === 'superset' && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="h-3 w-3 text-purple-400" />
            <span className="text-xs text-purple-400 font-medium">Superset</span>
            <span className="text-xs text-muted-foreground">
              {supersetActiveIdx === 0 ? currentStep.exercises[1]?.name : currentStep.exercises[0]?.name} ensuite
            </span>
          </div>
        )}

        {/* Set pills - compact overview (clickable for editing) */}
        {activeExercise && (
          <div className="flex items-center gap-1.5 mb-4 justify-center flex-wrap">
            {activeExercise.sets.map((set, idx) => {
              const isActive = idx === activeSetIndex;
              const isDone = set.isCompleted || !!exerciseSets[activeExercise.id]?.[set.id]?.isCompleted;
              const isEditing = editingSetId === set.id;
              return (
                <button key={set.id}
                  onClick={() => {
                    setEditingSetId(isEditing ? null : set.id);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isEditing ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                      : isDone ? 'bg-success/20 text-success' 
                      : isActive ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                      : 'bg-secondary/50 text-muted-foreground'
                  } cursor-pointer hover:ring-2 hover:ring-primary/40`}
                >
                  {isDone ? (
                    activeExercise.mode === 'time'
                      ? `✓ ${set.completedDuration || 0}s`
                      : `✓ ${set.completedWeight || 0}×${set.completedReps || 0}`
                  ) : (
                    `S${idx + 1}`
                  )}
                </button>
              );
            })}
            {/* Add set button */}
            <button
              onClick={() => handleAddSet(activeExercise.id)}
              className="px-2 py-1 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              title="Ajouter une série"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Editing a completed set */}
        {activeExercise && editingSetId && (() => {
          const editIdx = activeExercise.sets.findIndex(s => s.id === editingSetId);
          const editSet = editIdx >= 0 ? activeExercise.sets[editIdx] : null;
          if (!editSet) return null;
          return (
            <div className="bg-card rounded-xl border border-primary/30 p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-primary font-medium">✏️ Modification série {editIdx + 1}</span>
                <button onClick={() => setEditingSetId(null)} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
              </div>
              <SetInput
                key={`edit-${editSet.id}`}
                set={editSet}
                index={editIdx}
                exerciseMode={activeExercise.mode}
                isActive={true}
                lastPerformance={getLastPerfForExercise(activeExercise, editSet.id, editIdx + 1)}
                personalBest={getPersonalBest(activeExercise, editSet.type)}
                onUpdate={(updatedSet) => handleSetUpdate(activeExercise.id, editSet.id, updatedSet)}
                onComplete={(completedSet) => {
                  handleSetComplete(activeExercise.id, editSet.id, completedSet, activeExercise.name);
                  setEditingSetId(null);
                }}
              />
            </div>
          );
        })()}

        {/* Active set - the main input area */}
        {activeExercise && activeSet && !editingSetId && (
          <div className="bg-card rounded-xl border border-border p-4">
            <SetInput
              key={activeSet.id}
              set={activeSet}
              index={activeSetIndex}
              exerciseMode={activeExercise.mode}
              isActive={true}
              lastPerformance={getLastPerfForExercise(activeExercise, activeSet.id, activeSetIndex + 1)}
              personalBest={getPersonalBest(activeExercise, activeSet.type)}
              onUpdate={(updatedSet) => handleSetUpdate(activeExercise.id, activeSet.id, updatedSet)}
              onComplete={(completedSet) => handleSetComplete(activeExercise.id, activeSet.id, completedSet, activeExercise.name)}
            />
          </div>
        )}

        {/* All sets done for this exercise */}
        {activeExercise && !activeSet && (
          <div className="bg-card rounded-xl border border-success/30 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Exercice terminé !</p>
            {currentStepIndex < navSteps.length - 1 && (
              <Button onClick={goNext} className="mt-3 btn-primary-gradient">
                Exercice suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Remaining exercises - collapsible */}
        {remainingSteps.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowExerciseList(!showExerciseList)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Exercices suivants ({remainingSteps.reduce((n, s) => n + s.exercises.length, 0)})</span>
              {showExerciseList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <AnimatePresence>
              {showExerciseList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 mt-1">
                    {remainingSteps.map((step, i) => {
                      const stepIdx = currentStepIndex + 1 + i;
                      return step.exercises.map((ex, exIdx) => (
                        <button
                          key={ex.id}
                          onClick={() => { setCurrentStepIndex(stepIdx); setSupersetActiveIdx(exIdx); setShowExerciseList(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all"
                        >
                          {step.type === 'superset' && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                              {exIdx === 0 ? 'A' : 'B'}
                            </span>
                          )}
                          <span className="flex-1 text-left text-sm text-muted-foreground">{ex.name}</span>
                          <span className="text-xs text-muted-foreground">{ex.sets.length}s</span>
                        </button>
                      ));
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add exercise button */}
        <div className="mt-4">
          <button
            onClick={() => setShowExercisePicker('new')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Ajouter un exercice</span>
          </button>
        </div>

        {allSetsCompleted && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <Button onClick={handleEndWorkout} className="w-full btn-primary-gradient glow-primary py-6 text-lg">
              <CheckCircle2 className="h-5 w-5 mr-2" />Terminer l'entraînement
            </Button>
          </motion.div>
        )}
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
