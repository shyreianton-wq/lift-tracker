import { Plus } from 'lucide-react';
import { Exercise, WorkoutSet } from '@/types/workout';

interface SeriesPillsProps {
  exercise: Exercise;
  activeSetIndex: number;
  editingSetId: string | null;
  // Map of exercise.id -> per-set transient state (used to check `isCompleted` while editing in memory)
  exerciseSets: Record<string, Record<string, WorkoutSet>>;
  onSelectSet: (setId: string | null) => void;
  onAddSet: (exerciseId: string) => void;
}

export function SeriesPills({
  exercise,
  activeSetIndex,
  editingSetId,
  exerciseSets,
  onSelectSet,
  onAddSet,
}: SeriesPillsProps) {
  return (
    <div className="flex items-center gap-1.5 mb-4 justify-center flex-wrap">
      {exercise.sets.map((set, idx) => {
        const isActive = idx === activeSetIndex;
        const isDone = set.isCompleted || !!exerciseSets[exercise.id]?.[set.id]?.isCompleted;
        const isEditing = editingSetId === set.id;
        return (
          <button
            key={set.id}
            onClick={() => onSelectSet(isEditing ? null : set.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isEditing ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                : isDone ? 'bg-success/20 text-success'
                : isActive ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                : 'bg-secondary/50 text-muted-foreground'
            } cursor-pointer hover:ring-2 hover:ring-primary/40`}
          >
            {isDone ? (
              exercise.mode === 'time'
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
        onClick={() => onAddSet(exercise.id)}
        className="px-2 py-1 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        title="Ajouter une série"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
