import { Plus, Check } from 'lucide-react';
import { Exercise, WorkoutHistory, WorkoutSet } from '@/types/workout';

interface SeriesStripProps {
  exercise: Exercise;
  previousSession: Map<number, WorkoutHistory>;
  activeSetIndex: number;
  editingSetId: string | null;
  exerciseSets: Record<string, Record<string, WorkoutSet>>;
  onSelectSet: (setId: string | null) => void;
  onAddSet: (exerciseId: string) => void;
}

// Grille horizontale compacte: 1 carte par série côte à côte + carte + à droite.
// Chaque carte montre: numéro / perf N-1 / état actuel.
export function SeriesStrip({
  exercise,
  previousSession,
  activeSetIndex,
  editingSetId,
  exerciseSets,
  onSelectSet,
  onAddSet,
}: SeriesStripProps) {
  return (
    <div className="mb-3 flex items-stretch gap-1.5">
      {exercise.sets.map((set, idx) => {
        const setIdx1 = idx + 1;
        const prev = previousSession.get(setIdx1);
        const transient = exerciseSets[exercise.id]?.[set.id];
        const isDone = set.isCompleted || !!transient?.isCompleted;
        const isEditing = editingSetId === set.id;
        const isActive = isEditing || (!editingSetId && idx === activeSetIndex);
        const doneW = transient?.completedWeight ?? set.completedWeight;
        const doneR = transient?.completedReps ?? set.completedReps;
        const doneD = transient?.completedDuration ?? set.completedDuration;

        return (
          <button
            key={set.id}
            type="button"
            onClick={() => onSelectSet(isEditing ? null : set.id)}
            className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg text-center transition-colors ${
              isActive ? 'bg-primary/15 ring-1 ring-primary/40'
                : isDone ? 'bg-success/10 hover:bg-success/15'
                : 'bg-secondary/40 hover:bg-secondary/60'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold tracking-wide ${
              isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground/70'
            }`}>
              S{setIdx1}
            </div>

            {/* Perf séance N-1 */}
            <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/80 leading-tight">
              {prev ? (
                <>{prev.weight}<span className="text-muted-foreground/50">kg</span>×{prev.reps}</>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </div>

            {/* État actuel */}
            <div className="mt-0.5 text-xs font-bold tabular-nums leading-tight flex items-center justify-center gap-0.5">
              {isDone ? (
                <>
                  <Check className="h-3 w-3 text-success" />
                  <span className="text-success">
                    {exercise.mode === 'time' ? `${doneD || 0}s` : `${doneW || 0}×${doneR || 0}`}
                  </span>
                </>
              ) : isActive ? (
                <span className="text-[10px] uppercase font-bold text-primary">en cours</span>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </div>
          </button>
        );
      })}

      {/* Bouton + à droite, même hauteur, largeur fixe */}
      <button
        type="button"
        onClick={() => onAddSet(exercise.id)}
        aria-label="Ajouter une série"
        className="shrink-0 w-9 flex items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
