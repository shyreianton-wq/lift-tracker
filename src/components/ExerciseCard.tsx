import { motion } from 'framer-motion';
import { Exercise, WorkoutSet } from '@/types/workout';
import { SetInput } from '@/components/SetInput';
import { ChevronDown, ChevronUp, Dumbbell, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  isExpanded?: boolean;
  isTraining?: boolean;
  supersetLabel?: string;
  program?: any;
  getLastPerformance?: (setId: string, setIndex?: number) => { reps: number; weight: number; rpe?: number; duration?: number } | undefined;
  onSetUpdate?: (setId: string, set: WorkoutSet) => void;
  onSetComplete?: (setId: string, set: WorkoutSet) => void;
  onExerciseUpdate?: (exercise: Exercise) => void;
}

export function ExerciseCard({
  exercise,
  index,
  isExpanded: defaultExpanded = false,
  isTraining = false,
  supersetLabel,
  program,
  getLastPerformance,
  onSetUpdate,
  onSetComplete,
  onExerciseUpdate,
}: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  useEffect(() => { setIsExpanded(defaultExpanded); }, [defaultExpanded]);
  const completedSets = exercise.sets.filter(s => s.isCompleted).length;
  const totalSets = exercise.sets.length;
  const progress = (completedSets / totalSets) * 100;
  const isSuperset = !!exercise.supersetPairId;

  // Live progression % vs last session
  const progression = (() => {
    if (!getLastPerformance) return null;

    const computeScore = (weight: number, reps: number, rpe?: number, duration?: number) => {
      if (exercise.mode === 'time') {
        return (duration || 0) + (weight || 0) * 0.1;
      }
      if (weight === 0) return reps * (10.5 - (rpe || 7));
      return weight * reps * (10.5 - (rpe || 7));
    };

    let currentTotal = 0;
    let previousTotal = 0;
    let hasPrevious = false;

    for (const set of exercise.sets) {
      const prev = getLastPerformance(set.id, idx + 1);
      if (prev) {
        hasPrevious = true;
        previousTotal += computeScore(prev.weight, prev.reps, prev.rpe, prev.duration);

        // Use current values if entered, otherwise prediction = last time
        const hasInput = set.completedWeight != null || set.completedReps != null || set.completedDuration != null;
        if (set.isCompleted || hasInput) {
          currentTotal += computeScore(
            set.completedWeight ?? prev.weight,
            set.completedReps ?? prev.reps,
            set.rpe ?? prev.rpe,
            set.completedDuration ?? prev.duration
          );
        } else {
          currentTotal += computeScore(prev.weight, prev.reps, prev.rpe, prev.duration);
        }
      }
    }

    if (!hasPrevious || previousTotal === 0) return null;
    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card rounded-xl overflow-hidden border border-border"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              {supersetLabel && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  {supersetLabel}
                </span>
              )}
              <h3 className="font-semibold text-foreground">{exercise.name}</h3>
              {isSuperset && !supersetLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-0.5">
                  <Zap className="h-3 w-3" />SS
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm text-muted-foreground">{totalSets} séries</span>
              {isTraining && onExerciseUpdate ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newMode = exercise.mode === 'time' ? 'reps' : 'time';
                      onExerciseUpdate({ ...exercise, mode: newMode as any });
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                      exercise.mode === 'time' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {exercise.mode === 'time' ? '⏱ Temps' : '🔢 Reps'}
                  </button>
                  {exercise.mode !== 'time' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const current = exercise.sets[0]?.type || 'force';
                        const next = current === 'force' ? 'hypertrophie' : current === 'hypertrophie' ? 'myo-rep' : 'force';
                        onExerciseUpdate({
                          ...exercise,
                          sets: exercise.sets.map(s => ({ ...s, type: next })),
                        });
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        exercise.sets[0]?.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400'
                          : exercise.sets[0]?.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {exercise.sets[0]?.type === 'myo-rep' ? 'Myo' : exercise.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}
                    </button>
                  )}
                </>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                  exercise.mode === 'time' ? 'bg-blue-500/20 text-blue-400'
                    : exercise.sets[0]?.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400'
                    : exercise.sets[0]?.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {exercise.mode === 'time' ? 'Temps' : exercise.sets[0]?.type === 'myo-rep' ? 'Myo' : exercise.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTraining && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-sm text-muted-foreground min-w-[40px]">
                {completedSets}/{totalSets}
              </span>
              {progression !== null && (
                <span className={`text-xs font-bold ${
                  progression > 0 ? 'text-green-400' : progression < 0 ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {progression > 0 ? '📈+' : progression < 0 ? '📉' : '➡️'}{progression}%
                </span>
              )}
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Sets */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4"
        >
          <div className="space-y-2">
            {exercise.sets.map((set, setIndex) => {
              const isActiveSet = isTraining && setIndex === completedSets;
              const isCompletedSet = set.isCompleted;
              const isCollapsed = isTraining && !isActiveSet;

              if (isCollapsed) {
                return (
                  <div key={set.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      isCompletedSet ? 'bg-success/10' : 'bg-secondary/30'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompletedSet ? 'bg-success text-success-foreground' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {isCompletedSet ? '✓' : setIndex + 1}
                    </span>
                    <span className={`text-sm ${isCompletedSet ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Série {setIndex + 1}
                    </span>
                    {isCompletedSet && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {exercise.mode === 'time'
                          ? `${set.completedDuration || 0}s`
                          : `${set.completedWeight || 0}kg × ${set.completedReps || 0}`
                        }
                        {set.rpe ? ` @${set.rpe}` : ''}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <SetInput
                  key={set.id}
                  set={set}
                  index={setIndex}
                  exerciseMode={exercise.mode}
                  isActive={isActiveSet}
                  lastPerformance={getLastPerformance?.(set.id, setIndex + 1)}
                  onUpdate={(updatedSet) => onSetUpdate?.(set.id, updatedSet)}
                  onComplete={(completedSet) => onSetComplete?.(set.id, completedSet)}
                />
              );
            })}
          </div>
          
          {exercise.notes && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              {exercise.notes}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
