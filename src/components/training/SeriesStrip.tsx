import { Plus, Check } from 'lucide-react';
import { Exercise, WorkoutHistory, WorkoutSet } from '@/types/workout';

interface SeriesStripProps {
  exercise: Exercise;
  // Map<setIndex 1-based, WorkoutHistory> de la séance précédente
  previousSession: Map<number, WorkoutHistory>;
  // Index 0-based de la série en cours
  activeSetIndex: number;
  // Set sélectionné pour édition (override de la série active)
  editingSetId: string | null;
  // Sets transients (in-memory updates pas encore persistés)
  exerciseSets: Record<string, Record<string, WorkoutSet>>;
  onSelectSet: (setId: string | null) => void;
  onAddSet: (exerciseId: string) => void;
}

function relativeDate(iso?: string): string | null {
  if (!iso) return null;
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.round(days/7)}sem`;
  if (days < 365) return `il y a ${Math.round(days/30)}mois`;
  return `il y a ${Math.round(days/365)}an`;
}

// Frise horizontale unique remplaçant SeriesPills + SeriesComparison.
// Chaque ligne: numéro série | perf séance N-1 | état actuel. Tap = sélection.
export function SeriesStrip({
  exercise,
  previousSession,
  activeSetIndex,
  editingSetId,
  exerciseSets,
  onSelectSet,
  onAddSet,
}: SeriesStripProps) {
  const firstPrev = previousSession.values().next().value as WorkoutHistory | undefined;
  const dateLabel = firstPrev ? relativeDate(firstPrev.completedAt) : null;

  return (
    <div className="mb-3">
      {(dateLabel || previousSession.size > 0) && (
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold">
            Séries · N-1 vs actuel
          </span>
          {dateLabel && <span className="text-[10px] text-muted-foreground/70">{dateLabel}</span>}
        </div>
      )}

      <div className="space-y-1">
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                isActive ? 'bg-primary/15 ring-1 ring-primary/40'
                  : isDone ? 'bg-success/10 hover:bg-success/15'
                  : 'bg-secondary/40 hover:bg-secondary/60'
              }`}
            >
              {/* Label série */}
              <span
                className={`shrink-0 w-7 text-xs font-bold tabular-nums ${
                  isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground'
                }`}
              >
                S{setIdx1}
              </span>

              {/* Perf séance N-1 (milieu) */}
              <span className="flex-1 text-sm tabular-nums text-muted-foreground/90">
                {prev ? (
                  <>
                    {prev.weight}<span className="text-[10px] text-muted-foreground/60">kg</span>
                    {' × '}{prev.reps}
                    {prev.rpe ? <span className="text-muted-foreground/60">{' @'}{prev.rpe}</span> : null}
                  </>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </span>

              {/* État actuel (droite) */}
              <span className="shrink-0 flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                {isDone ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span className="text-success">
                      {exercise.mode === 'time'
                        ? `${doneD || 0}s`
                        : `${doneW || 0}×${doneR || 0}`}
                    </span>
                  </>
                ) : isActive ? (
                  <span className="text-[10px] uppercase font-bold text-primary">en cours</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </span>
            </button>
          );
        })}

        {/* Bouton ajouter série */}
        <button
          type="button"
          onClick={() => onAddSet(exercise.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Ajouter une série</span>
        </button>
      </div>
    </div>
  );
}
