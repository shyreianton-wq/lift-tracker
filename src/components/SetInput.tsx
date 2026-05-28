import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSet, SetType } from '@/types/workout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, TrendingUp, TrendingDown, Minus, Plus, Pencil, Trophy } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type LastPerf = { reps: number; weight: number; rpe?: number; duration?: number; myoRestPauseCount?: number; completedAt?: string; setType?: SetType };

interface SetInputProps {
  set: WorkoutSet;
  index: number;
  exerciseMode?: 'reps' | 'time';
  lastPerformance?: LastPerf;
  personalBest?: { weight: number; reps: number; score: number };
  onUpdate: (set: WorkoutSet) => void;
  onComplete: (set: WorkoutSet) => void;
  isActive: boolean;
}

// Long-press helper: fires immediately, then repeats while held
function useHoldRepeat(callback: () => void, delay = 350, repeat = 80) {
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (t1.current) { clearTimeout(t1.current); t1.current = null; }
    if (t2.current) { clearInterval(t2.current); t2.current = null; }
  };
  const start = () => {
    callback();
    t1.current = setTimeout(() => {
      t2.current = setInterval(callback, repeat);
    }, delay);
  };
  useEffect(() => stop, []);
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop };
}

function relativeDate(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.round((now - then) / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.round(days/7)}sem`;
  if (days < 365) return `il y a ${Math.round(days/30)}mois`;
  return `il y a ${Math.round(days/365)}an`;
}

export function SetInput({ set, index, exerciseMode = 'reps', lastPerformance, personalBest, onUpdate, onComplete, isActive }: SetInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const stopwatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showWeightForTime, setShowWeightForTime] = useState(false);
  const [pulsePr, setPulsePr] = useState(false);

  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchRef.current = setInterval(() => setStopwatchTime(t => t + 1), 1000);
    } else if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
    }
    return () => { if (stopwatchRef.current) clearInterval(stopwatchRef.current); };
  }, [stopwatchRunning]);

  const editable = !set.isCompleted || isEditing;

  // ===== Refactor 2026-05-28 =====
  // Three distinct concepts that were previously conflated on set.completedWeight:
  //   1. saved value      : set.completedWeight after isCompleted=true (or during edit)
  //   2. draft value      : what's currently in the input (default OR user-typed)
  //   3. user override    : explicit boolean — has the user touched this set's input?
  //
  // Local state tracks (2) and (3). (1) lives on set as before.
  // When external defaults change (type toggle, exo swap → new lastPerformance)
  // AND the user hasn't typed, draft reactively follows. The input always shows
  // weightDraft/repsDraft — no more empty-input + placeholder dance.
  //
  // Auto-fill effect is gone: redundant since draft is initialized + reacts to defaults.

  const defaultWeight = lastPerformance?.weight ?? set.targetWeight ?? 0;
  const defaultReps = lastPerformance?.reps ?? set.targetReps ?? 0;
  const defaultDuration = lastPerformance?.duration ?? set.targetDuration ?? 30;

  // Track who set the value last: 'user' if the user typed, 'auto' if from defaults.
  // Initialized from props: completed sets keep their saved values; fresh sets start from default.
  const [weightDraft, setWeightDraft] = useState<number>(set.completedWeight ?? defaultWeight);
  const [repsDraft, setRepsDraft] = useState<number>(set.completedReps ?? defaultReps);
  const [durationDraft, setDurationDraft] = useState<number>(set.completedDuration ?? defaultDuration);
  const [userWeight, setUserWeight] = useState<boolean>(set.isCompleted || set.completedWeight != null);
  const [userReps, setUserReps] = useState<boolean>(set.isCompleted || set.completedReps != null);

  // React to default changes (e.g. type toggle changes lastPerformance) when user hasn't typed.
  // Stays silent for completed sets — their saved values are sacred.
  useEffect(() => {
    if (set.isCompleted) return;
    if (userWeight) return;
    setWeightDraft(defaultWeight);
  }, [defaultWeight, userWeight, set.isCompleted]);
  useEffect(() => {
    if (set.isCompleted) return;
    if (userReps) return;
    setRepsDraft(defaultReps);
  }, [defaultReps, userReps, set.isCompleted]);

  // Convenience for the rest of the component
  const currentWeight = weightDraft;
  const currentReps = repsDraft;
  const currentDuration = durationDraft;
  const userTouchedWeight = userWeight;
  const userTouchedReps = userReps;

  const handleDurationChange = (value: string) => { const n = parseInt(value) || 0; setDurationDraft(n); onUpdate({ ...set, completedDuration: n }); };
  const adjustDuration = (delta: number) => { const n = Math.max(0, currentDuration + delta); setDurationDraft(n); onUpdate({ ...set, completedDuration: n }); };
  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleWeightChange = (value: string) => {
    const n = parseFloat(value) || 0;
    setWeightDraft(n);
    setUserWeight(true);
    onUpdate({ ...set, completedWeight: n });
  };
  const handleRepsChange = (value: string) => {
    const n = parseInt(value) || 0;
    setRepsDraft(n);
    setUserReps(true);
    onUpdate({ ...set, completedReps: n });
  };
  const adjustWeight = (delta: number) => {
    const n = Math.max(0, currentWeight + delta);
    setWeightDraft(n);
    setUserWeight(true);
    onUpdate({ ...set, completedWeight: n });
  };
  const adjustReps = (delta: number) => {
    const n = Math.max(0, currentReps + delta);
    setRepsDraft(n);
    setUserReps(true);
    onUpdate({ ...set, completedReps: n });
  };

  // Smart weight step: heavier = larger increment
  const weightStep = currentWeight >= 60 ? 2.5 : currentWeight >= 20 ? 1 : 0.5;

  const handleComplete = () => {
    const completionData: WorkoutSet = exerciseMode === 'time'
      ? { ...set, completedDuration: stopwatchTime > 0 ? stopwatchTime : currentDuration, completedWeight: set.completedWeight || 0, completedReps: 0, rpe: set.rpe ?? 7, isCompleted: true }
      : { ...set, completedWeight: currentWeight, completedReps: currentReps, rpe: set.rpe ?? 7, isCompleted: true };

    // PR detection
    if (personalBest && exerciseMode === 'reps') {
      const score = (completionData.completedWeight || 0) * (completionData.completedReps || 0);
      if (score > personalBest.score) {
        setPulsePr(true);
        try { (navigator as any).vibrate?.([30, 60, 30, 60, 100]); } catch {}
        setTimeout(() => setPulsePr(false), 2200);
      }
    }
    try { (navigator as any).vibrate?.(20); } catch {}

    onComplete(completionData);
    if (stopwatchRunning) setStopwatchRunning(false);
    setIsEditing(false);
  };

  const handleEdit = () => setIsEditing(true);

  const getProgressIndicator = () => {
    if (!lastPerformance || !set.isCompleted) return null;
    const cw = set.completedWeight || 0;
    const cr = set.completedReps || 0;
    if (cw > lastPerformance.weight || cr > lastPerformance.reps) return <TrendingUp className="h-4 w-4 text-success" />;
    if (cw < lastPerformance.weight || cr < lastPerformance.reps) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // PR projection for current input
  const projectedScore = (set.completedWeight ?? currentWeight) * (set.completedReps ?? currentReps);
  const willBeatPb = personalBest && exerciseMode === 'reps' && (userTouchedWeight || userTouchedReps) && projectedScore > personalBest.score;

  const weightHold = useHoldRepeat(() => adjustWeight(weightStep));
  const weightHoldDown = useHoldRepeat(() => adjustWeight(-weightStep));
  const repsHold = useHoldRepeat(() => adjustReps(1));
  const repsHoldDown = useHoldRepeat(() => adjustReps(-1));

  const rpeLevels = [
    { label: 'Easy', emoji: '😎', rpe: 6.5, color: 'bg-success/80 border-success text-white', ring: 'ring-success/40' },
    { label: 'Medium', emoji: '💪', rpe: 7.5, color: 'bg-yellow-500/80 border-yellow-500 text-white', ring: 'ring-yellow-500/40' },
    { label: 'Hard', emoji: '🔥', rpe: 8.5, color: 'bg-orange-500/80 border-orange-500 text-white', ring: 'ring-orange-500/40' },
    { label: 'Very Hard', emoji: '☠️', rpe: 10, color: 'bg-destructive/80 border-destructive text-white', ring: 'ring-destructive/40' },
  ];
  const _displayRpe = set.rpe || 7;
  let _idx = rpeLevels.findIndex(l => l.rpe >= _displayRpe);
  const rpeIdx = _idx < 0 ? 0 : _idx;
  const cycleRpe = (dir: 1 | -1) => {
    if (!editable) return;
    const nextIdx = (rpeIdx + dir + rpeLevels.length) % rpeLevels.length;
    onUpdate({ ...set, rpe: rpeLevels[nextIdx].rpe });
    try { (navigator as any).vibrate?.(10); } catch {}
  };
  const rpeHoldBack = useHoldRepeat(() => cycleRpe(-1), 600, 400);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-3 rounded-lg transition-all ${set.isCompleted && !isEditing ? 'bg-success/10 border border-success/20' : isActive ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/50'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">Série {index + 1}</span>
          <button
            type="button"
            onClick={() => {
              const newType = set.type === 'force' ? 'hypertrophie' : set.type === 'hypertrophie' ? 'myo-rep' : 'force';
              onUpdate({ ...set, type: newType });
            }}
            className={`text-xs px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer min-h-[28px] ${
              set.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                : set.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
            title="Cliquer pour changer le type (temporaire)"
          >
            {set.type === 'myo-rep' ? 'MYO' : set.type === 'hypertrophie' ? 'HYP' : 'FORCE'}
          </button>
          {getProgressIndicator()}
          <AnimatePresence>
            {(pulsePr || (set.isCompleted && personalBest && (set.completedWeight||0)*(set.completedReps||0) >= personalBest.score)) && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold"
              >
                <Trophy className="h-3 w-3" /> PR
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          {lastPerformance ? (() => {
            const prevType = lastPerformance.setType || "force";
            const curType = set.type || "force";
            const typeMismatch = prevType !== curType;
            const typeShort = prevType === "myo-rep" ? "MYO" : prevType === "hypertrophie" ? "HYP" : "FORCE";
            const typeColor = prevType === "myo-rep" ? "text-orange-400" : prevType === "hypertrophie" ? "text-blue-400" : "text-emerald-400";
            return (
              <div className="text-right text-muted-foreground">
                <div className="text-xs font-medium">
                  <span className="text-muted-foreground/70 uppercase tracking-wide text-[10px] mr-1">Préc</span>
                  {typeMismatch && (
                    <span className={`uppercase tracking-wide text-[10px] mr-1 font-semibold ${typeColor}`} title={`Dernière perf en ${prevType}`}>
                      · {typeShort}
                    </span>
                  )}
                  {lastPerformance.weight}kg × {lastPerformance.reps}
                  {lastPerformance.rpe && ` @${lastPerformance.rpe}`}
                </div>
                {relativeDate(lastPerformance.completedAt) && (
                  <div className="text-[10px] text-muted-foreground/70">{relativeDate(lastPerformance.completedAt)}</div>
                )}
              </div>
            );
          })() : (
            <div className="text-right text-muted-foreground/70">
              <div className="text-[10px] uppercase tracking-wide">Première fois{set.type ? ` en ${set.type}` : ''}</div>
            </div>
          )}
          {set.isCompleted && !isEditing && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleEdit} title="Modifier cette série">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PR projection hint */}
      {willBeatPb && !set.isCompleted && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-500 flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5" />
          <span className="font-semibold">PR potentiel</span>
          <span className="text-muted-foreground">si tu valides — record actuel {personalBest!.weight}kg × {personalBest!.reps}</span>
        </div>
      )}

      {/* Inputs */}
      {exerciseMode === 'time' ? (
        <div className="space-y-3">
          {lastPerformance && lastPerformance.duration != null && lastPerformance.duration > 0 && (
            <div className="text-center mb-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Dernière fois</span>
              <p className="text-sm font-medium text-muted-foreground">
                {formatDur(lastPerformance.duration)}
                {lastPerformance.weight > 0 && ` • ${lastPerformance.weight}kg`}
              </p>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {formatDur(stopwatchRunning || stopwatchTime > 0 ? stopwatchTime : (set.isCompleted ? set.completedDuration || 0 : currentDuration))}
            </div>
            <div className="flex items-center gap-2">
              {!set.isCompleted && (
                <>
                  <Button type="button" onClick={() => {
                      if (stopwatchRunning) { setStopwatchRunning(false); onUpdate({ ...set, completedDuration: stopwatchTime }); }
                      else { if (stopwatchTime === 0) setStopwatchTime(0); setStopwatchRunning(true); }
                    }}
                    className={`h-11 px-6 rounded-full font-bold ${stopwatchRunning ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'btn-primary-gradient'}`}
                  >
                    {stopwatchRunning ? '⏸ Stop' : stopwatchTime > 0 ? '▶ Reprendre' : '▶ Lancer'}
                  </Button>
                  {stopwatchTime > 0 && !stopwatchRunning && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setStopwatchTime(0); onUpdate({ ...set, completedDuration: 0 }); }}>Reset</Button>
                  )}
                </>
              )}
            </div>
            {stopwatchTime > 0 && !stopwatchRunning && !set.isCompleted && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={() => { const t = Math.max(0, stopwatchTime - 1); setStopwatchTime(t); onUpdate({ ...set, completedDuration: t }); }}>-1s</Button>
                <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={() => { const t = stopwatchTime + 1; setStopwatchTime(t); onUpdate({ ...set, completedDuration: t }); }}>+1s</Button>
              </div>
            )}
          </div>
          {!showWeightForTime && !set.isCompleted && (
            <button type="button" onClick={() => setShowWeightForTime(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1">+ Ajouter du lest (poids)</button>
          )}
          {(showWeightForTime || (set.completedWeight && set.completedWeight > 0)) && (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Lest (kg)</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...weightHoldDown} disabled={!editable}><Minus className="h-4 w-4" /></Button>
                <Input type="number" inputMode="decimal" step="0.5" value={currentWeight} onChange={(e) => handleWeightChange(e.target.value)} disabled={!editable} className="h-11 text-center text-base font-semibold input-dark px-1 min-w-0" />
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...weightHold} disabled={!editable}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Poids (kg) <span className="text-muted-foreground/60">±{weightStep}</span></span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...weightHoldDown} disabled={!editable}><Minus className="h-4 w-4" /></Button>
              <Input type="number" inputMode="decimal" step={weightStep} value={currentWeight} onChange={(e) => handleWeightChange(e.target.value)} disabled={!editable} className="h-11 text-center text-base font-semibold input-dark px-1 min-w-0" />
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...weightHold} disabled={!editable}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Reps</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...repsHoldDown} disabled={!editable}><Minus className="h-4 w-4" /></Button>
              <Input type="number" inputMode="numeric" value={currentReps} onChange={(e) => handleRepsChange(e.target.value)} disabled={!editable} className="h-11 text-center text-base font-semibold input-dark px-1 min-w-0" />
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" {...repsHold} disabled={!editable}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Myo rest-pause counter */}
      {set.type === 'myo-rep' && index > 0 && editable && (
        <div className="mt-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">Mini-sets rest-pause</span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => { const count = Math.max(0, (set.myoRestPauseCount || 0) - 1); const autoRpe = count <= 3 ? 6.5 : count <= 5 ? 7.5 : count <= 7 ? 8.5 : 10; onUpdate({ ...set, myoRestPauseCount: count, rpe: autoRpe }); }} disabled={(set.myoRestPauseCount || 0) <= 0}><Minus className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-orange-400 min-w-[2ch] text-center">{set.myoRestPauseCount || 0}</span>
              <span className="text-sm text-muted-foreground">{(set.myoRestPauseCount || 0) <= 3 ? '😎' : (set.myoRestPauseCount || 0) <= 5 ? '💪' : (set.myoRestPauseCount || 0) <= 7 ? '🔥' : '☠️'}</span>
            </div>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => { const count = (set.myoRestPauseCount || 0) + 1; const autoRpe = count <= 3 ? 6.5 : count <= 5 ? 7.5 : count <= 7 ? 8.5 : 10; onUpdate({ ...set, myoRestPauseCount: count, rpe: autoRpe }); }}><Plus className="h-4 w-4" /></Button>
          </div>
          {(set.myoRestPauseCount || 0) > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">RPE auto → {set.rpe || '?'} • {(set.myoRestPauseCount || 0) <= 3 ? 'Easy' : (set.myoRestPauseCount || 0) <= 5 ? 'Medium' : (set.myoRestPauseCount || 0) <= 7 ? 'Hard' : 'Very Hard'}</p>
          )}
        </div>
      )}
      {set.type === 'myo-rep' && index > 0 && !editable && set.myoRestPauseCount != null && set.myoRestPauseCount > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rest-pause</span>
          <span className="text-sm font-bold text-orange-400">{set.myoRestPauseCount} mini-sets</span>
          <span className="text-[10px] text-muted-foreground">{set.myoRestPauseCount <= 3 ? '😎 Easy' : set.myoRestPauseCount <= 5 ? '💪 Medium' : set.myoRestPauseCount <= 7 ? '🔥 Hard' : '☠️ Very Hard'}</span>
        </div>
      )}

      {/* RPE - tap forward, long-press backward */}
      <div className="mt-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">{set.type === 'myo-rep' && set.myoRestPauseCount ? 'RPE (auto)' : 'Difficulté'}</span>
        {(() => {
          const activeLevel = rpeLevels[rpeIdx];

          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => cycleRpe(1)}
                {...rpeHoldBack}
                disabled={!editable}
                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ring-4 ${activeLevel.color} ${activeLevel.ring} ${!editable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              >
                <span className="text-xl">{activeLevel.emoji}</span>
                <span className="text-[9px] font-bold leading-none mt-0.5">{activeLevel.rpe}</span>
              </button>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeLevel.label}</p>
                <p className="text-[10px] text-muted-foreground">Tap : ↑ • Hold : ↓</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Validate button — fixed at bottom of viewport when this set is active, inline otherwise */}
      {editable && (
        isActive ? (
          <>
            {/* Spacer so content above isn't hidden by the fixed button on mobile */}
            <div aria-hidden className="h-20" />
            <div className="fixed bottom-3 left-3 right-3 z-40 pb-[env(safe-area-inset-bottom)]">
              <Button
                onClick={handleComplete}
                className={`w-full h-14 transition-all text-base font-semibold shadow-lg ${set.isCompleted ? 'bg-success hover:bg-success/90' : 'btn-primary-gradient hover:opacity-90'}`}
              >
                <Check className="h-5 w-5 mr-2" />
                {set.isCompleted ? 'Re-valider' : 'Valider la série'}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <Button
              onClick={handleComplete}
              className={`w-full h-12 transition-all text-base font-semibold ${set.isCompleted ? 'bg-success hover:bg-success/90' : 'btn-primary-gradient hover:opacity-90'}`}
            >
              <Check className="h-5 w-5 mr-2" />
              {set.isCompleted ? 'Re-valider' : 'Valider la série'}
            </Button>
          </div>
        )
      )}
    </motion.div>
  );
}
