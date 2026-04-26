import { motion } from 'framer-motion';
import { WorkoutSet } from '@/types/workout';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Stopwatch } from '@/components/Stopwatch';
import { useState } from 'react';

interface TimeSetInputProps {
  set: WorkoutSet;
  index: number;
  lastPerformance?: { duration?: number; weight: number; rpe?: number };
  onUpdate: (set: WorkoutSet) => void;
  onComplete: (set: WorkoutSet) => void;
  isActive: boolean;
}

export function TimeSetInput({ set, index, lastPerformance, onUpdate, onComplete, isActive }: TimeSetInputProps) {
  const [showWeight, setShowWeight] = useState((lastPerformance?.weight && lastPerformance.weight > 0) || (set.targetWeight && set.targetWeight > 0) ? true : false);
  const currentWeight = set.completedWeight ?? lastPerformance?.weight ?? set.targetWeight;

  const handleWeightChange = (value: string) => {
    const weight = parseFloat(value) || 0;
    onUpdate({ ...set, completedWeight: weight });
  };

  const adjustWeight = (delta: number) => {
    const newWeight = Math.max(0, currentWeight + delta);
    onUpdate({ ...set, completedWeight: newWeight });
  };

  const handleStopwatchComplete = (durationSeconds: number) => {
    onComplete({
      ...set,
      completedWeight: showWeight ? currentWeight : 0,
      completedDuration: durationSeconds,
      completedReps: 0,
      rpe: set.rpe ?? 7,
      isCompleted: true,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-3 rounded-lg transition-all ${
        set.isCompleted
          ? 'bg-success/10 border border-success/20'
          : isActive
            ? 'bg-primary/10 border border-primary/20'
            : 'bg-secondary/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">Série {index + 1}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 bg-blue-500/20 text-blue-400">
            TEMPS
          </Badge>
        </div>
        {lastPerformance?.duration && (
          <div className="text-right text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wide">Préc: </span>
            <span className="text-xs font-medium">
              {formatDuration(lastPerformance.duration)}
              {(lastPerformance.weight || 0) > 0 && ` @ ${lastPerformance.weight}kg`}
            </span>
          </div>
        )}
      </div>

      {set.isCompleted ? (
        <div className="text-center py-4">
          <div className="text-2xl font-bold text-success">
            {formatDuration(set.completedDuration || 0)}
          </div>
          {(set.completedWeight || 0) > 0 && (
            <div className="text-sm text-muted-foreground">
              @ {set.completedWeight}kg
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Optional weight */}
          {!showWeight ? (
            <button
              type="button"
              onClick={() => setShowWeight(true)}
              className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1 mx-auto transition-colors"
            >
              <Plus className="h-3 w-3" /> Ajouter du poids
            </button>
          ) : (
            <div className="mb-3">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Poids (kg) — optionnel</span>
              <div className="flex items-center gap-1 max-w-[200px] mx-auto">
                <Button type="button" variant="outline" size="icon" className="h-9 w-8 shrink-0"
                  onClick={() => adjustWeight(-0.5)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Input type="number" inputMode="decimal" step="0.5" value={currentWeight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="h-9 text-center text-base font-semibold input-dark px-1" />
                <Button type="button" variant="outline" size="icon" className="h-9 w-8 shrink-0"
                  onClick={() => adjustWeight(0.5)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Stopwatch */}
          <Stopwatch
            onComplete={handleStopwatchComplete}
            targetDuration={set.targetDuration}
          />
        </>
      )}

      {/* RPE Scale */}
      <div className="mt-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">
          RPE (difficulté perçue)
        </span>
        <div className="flex gap-0.5">
          {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((rpe) => {
            const displayRpe = set.isCompleted ? set.rpe : set.rpe;
            const isSelected = displayRpe === rpe;
            const getRpeColor = (value: number) => {
              if (value <= 7) return 'bg-success/80 border-success text-success-foreground';
              if (value <= 8) return 'bg-yellow-500/80 border-yellow-500 text-white';
              if (value <= 9) return 'bg-orange-500/80 border-orange-500 text-white';
              return 'bg-destructive/80 border-destructive text-destructive-foreground';
            };

            return (
              <button
                key={rpe}
                type="button"
                onClick={() => !set.isCompleted && onUpdate({ ...set, rpe })}
                disabled={set.isCompleted}
                className={`flex-1 h-8 rounded-md text-xs font-semibold transition-all border-2 ${
                  isSelected
                    ? getRpeColor(rpe)
                    : 'bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary'
                } ${set.isCompleted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {Number.isInteger(rpe) ? rpe : ''}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
