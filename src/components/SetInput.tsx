import { motion } from 'framer-motion';
import { WorkoutSet, SetType } from '@/types/workout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SetInputProps {
  set: WorkoutSet;
  index: number;
  lastPerformance?: { reps: number; weight: number };
  onUpdate: (set: WorkoutSet) => void;
  onComplete: (set: WorkoutSet) => void;
  isActive: boolean;
}

export function SetInput({ set, index, lastPerformance, onUpdate, onComplete, isActive }: SetInputProps) {
  const handleWeightChange = (value: string) => {
    const weight = parseFloat(value) || 0;
    onUpdate({ ...set, completedWeight: weight });
  };

  const handleRepsChange = (value: string) => {
    const reps = parseInt(value) || 0;
    onUpdate({ ...set, completedReps: reps });
  };

  const handleComplete = () => {
    onComplete({
      ...set,
      completedWeight: set.completedWeight ?? set.targetWeight,
      completedReps: set.completedReps ?? set.targetReps,
      isCompleted: true,
    });
  };

  const getProgressIndicator = () => {
    if (!lastPerformance || !set.isCompleted) return null;
    
    const currentWeight = set.completedWeight || 0;
    const currentReps = set.completedReps || 0;
    const lastWeight = lastPerformance.weight;
    const lastReps = lastPerformance.reps;

    const weightDiff = currentWeight - lastWeight;
    const repsDiff = currentReps - lastReps;

    if (weightDiff > 0 || repsDiff > 0) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (weightDiff < 0 || repsDiff < 0) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        set.isCompleted 
          ? 'bg-success/10 border border-success/20' 
          : isActive 
            ? 'bg-primary/10 border border-primary/20' 
            : 'bg-secondary/50'
      }`}
    >
      {/* Set number and type */}
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-sm font-semibold text-foreground">{index + 1}</span>
        <Badge 
          variant="secondary" 
          className={`text-[10px] px-1.5 ${set.type === 'myo-rep' ? 'bg-primary/20 text-primary' : ''}`}
        >
          {set.type === 'myo-rep' ? 'MYO' : 'FORCE'}
        </Badge>
      </div>

      {/* Previous performance */}
      {lastPerformance && (
        <div className="flex flex-col items-center min-w-[60px] text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wide">Précédent</span>
          <span className="text-xs font-medium">{lastPerformance.weight}kg × {lastPerformance.reps}</span>
        </div>
      )}

      {/* Weight input */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex flex-col flex-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Poids (kg)</span>
          <Input
            type="number"
            step="0.5"
            value={set.isCompleted ? set.completedWeight : (set.completedWeight ?? set.targetWeight)}
            onChange={(e) => handleWeightChange(e.target.value)}
            disabled={set.isCompleted}
            className="h-9 text-center input-dark"
            placeholder={set.targetWeight.toString()}
          />
        </div>

        <span className="text-muted-foreground mt-4">×</span>

        {/* Reps input */}
        <div className="flex flex-col flex-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Reps</span>
          <Input
            type="number"
            value={set.isCompleted ? set.completedReps : (set.completedReps ?? set.targetReps)}
            onChange={(e) => handleRepsChange(e.target.value)}
            disabled={set.isCompleted}
            className="h-9 text-center input-dark"
            placeholder={set.targetReps.toString()}
          />
        </div>
      </div>

      {/* Progress indicator */}
      <div className="w-6 flex justify-center">
        {getProgressIndicator()}
      </div>

      {/* Complete button */}
      <Button
        size="icon"
        onClick={handleComplete}
        disabled={set.isCompleted}
        className={`h-9 w-9 transition-all ${
          set.isCompleted 
            ? 'bg-success hover:bg-success' 
            : 'btn-primary-gradient hover:opacity-90'
        }`}
      >
        <Check className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
