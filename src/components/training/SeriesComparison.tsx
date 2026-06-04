import { WorkoutHistory } from '@/types/workout';

interface SeriesComparisonProps {
  // Map<setIndex (1-based), WorkoutHistory> de la dernière occurrence de la même séance
  previousSession: Map<number, WorkoutHistory>;
  // Nombre de séries de l exo en cours
  totalSets: number;
  // Index 0-based de la série actuellement éditée
  activeSetIndex: number;
}

function relativeDate(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const days = Math.round((Date.now() - then) / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.round(days/7)}sem`;
  if (days < 365) return `il y a ${Math.round(days/30)}mois`;
  return `il y a ${Math.round(days/365)}an`;
}

// Frise horizontale: voir les 3 séries de la séance précédente côte à côte,
// avec la série en cours surlignée. Donne le contexte global "qu est ce que
// j ai battu / atteint la dernière fois" en un coup d œil.
export function SeriesComparison({ previousSession, totalSets, activeSetIndex }: SeriesComparisonProps) {
  if (previousSession.size === 0) return null;

  // Date relative basée sur la 1re entrée (toutes du même workout)
  const firstEntry = previousSession.values().next().value as WorkoutHistory | undefined;
  const dateLabel = firstEntry ? relativeDate(firstEntry.completedAt) : null;

  return (
    <div className="mb-3 px-3 py-2 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold">
          Séance précédente
        </span>
        {dateLabel && <span className="text-[10px] text-muted-foreground/70">{dateLabel}</span>}
      </div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto">
        {Array.from({ length: totalSets }, (_, i) => {
          const setIdx1 = i + 1;
          const prev = previousSession.get(setIdx1);
          const isActive = i === activeSetIndex;
          return (
            <div
              key={setIdx1}
              className={`flex-1 min-w-[64px] px-2 py-1.5 rounded-lg text-center ${
                isActive
                  ? 'bg-primary/15 ring-1 ring-primary/40'
                  : 'bg-background/40'
              }`}
            >
              <div className={`text-[9px] uppercase tracking-wide ${isActive ? 'text-primary' : 'text-muted-foreground/60'} font-semibold`}>
                S{setIdx1}
              </div>
              {prev ? (
                <div className="mt-0.5">
                  <div className="text-sm font-bold text-foreground tabular-nums">
                    {prev.weight}<span className="text-[10px] font-normal text-muted-foreground">kg</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    × {prev.reps}{prev.rpe ? ` @${prev.rpe}` : ''}
                  </div>
                </div>
              ) : (
                <div className="mt-0.5 text-[11px] text-muted-foreground/50">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
