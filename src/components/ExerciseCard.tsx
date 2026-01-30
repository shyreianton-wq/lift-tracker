import { motion } from 'framer-motion';
import { Exercise, WorkoutSet } from '@/types/workout';
import { SetInput } from '@/components/SetInput';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  isExpanded?: boolean;
  isTraining?: boolean;
  getLastPerformance?: (setId: string) => { reps: number; weight: number } | undefined;
  onSetUpdate?: (setId: string, set: WorkoutSet) => void;
  onSetComplete?: (setId: string, set: WorkoutSet) => void;
}

export function ExerciseCard({
  exercise,
  index,
  isExpanded: defaultExpanded = false,
  isTraining = false,
  getLastPerformance,
  onSetUpdate,
  onSetComplete,
}: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const completedSets = exercise.sets.filter(s => s.isCompleted).length;
  const totalSets = exercise.sets.length;
  const progress = (completedSets / totalSets) * 100;

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
            <h3 className="font-semibold text-foreground">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">
              {totalSets} séries • {exercise.sets[0]?.type === 'myo-rep' ? 'Myo-rep' : 'Force'}
            </p>
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
            {exercise.sets.map((set, setIndex) => (
              <SetInput
                key={set.id}
                set={set}
                index={setIndex}
                isActive={isTraining && setIndex === completedSets}
                lastPerformance={getLastPerformance?.(set.id)}
                onUpdate={(updatedSet) => onSetUpdate?.(set.id, updatedSet)}
                onComplete={(completedSet) => onSetComplete?.(set.id, completedSet)}
              />
            ))}
          </div>
          
          {exercise.notes && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              📝 {exercise.notes}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
