import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWorkout } from '@/contexts/WorkoutContext';
import {
  groupIntoWorkouts, workoutMetrics, findPreviousWorkout,
  volumeDeltaPct, matchedSeriesDeltaPct, exercisesInWorkout, formatDuration, relativeDate,
} from '@/components/history/historyHelpers';

function typeBadge(t?: string) {
  if (t === 'myo-rep') return { label: 'MYO', cls: 'bg-orange-500/20 text-orange-400' };
  if (t === 'hypertrophie') return { label: 'HYP', cls: 'bg-blue-500/20 text-blue-400' };
  return { label: 'FORCE', cls: 'bg-emerald-500/20 text-emerald-400' };
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { history, programs } = useWorkout();

  const workouts = useMemo(() => groupIntoWorkouts(history), [history]);
  const workout = useMemo(() => workouts.find(w => w.id === decodeURIComponent(id || '')), [workouts, id]);

  // Memoize prev + map par exo AVANT tout early return (rules of hooks)
  const prevWorkout = useMemo(
    () => workout ? findPreviousWorkout(workouts, workout.id) : undefined,
    [workouts, workout]
  );
  const prevExosByName = useMemo(() => {
    if (!prevWorkout) return new Map<string, ReturnType<typeof exercisesInWorkout>[number]>();
    const m = new Map<string, ReturnType<typeof exercisesInWorkout>[number]>();
    for (const e of exercisesInWorkout(prevWorkout, programs)) m.set(e.exerciseName, e);
    return m;
  }, [prevWorkout, programs]);

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Séance introuvable</p>
        <Button onClick={() => navigate('/history')}>Retour à l historique</Button>
      </div>
    );
  }

  const m = workoutMetrics(workout);
  const prev = prevWorkout;
  const delta = volumeDeltaPct(workout, prev);
  const exos = exercisesInWorkout(workout, programs);

  const program = programs.find(p => p.id === workout.programId);
  const session = program?.sessions.find(s => s.id === workout.sessionId);

  const TrendIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta === null ? 'text-muted-foreground'
    : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                {session?.name || 'Séance'}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {format(parseISO(workout.startedAt), "EEEE d MMM 'à' HH:mm", { locale: fr })} · {relativeDate(workout.startedAt)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-6">
        {/* Récap globale */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-foreground tabular-nums">{m.totalSets}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Séries</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground tabular-nums">{m.uniqueExercises}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Exos</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground tabular-nums">{(m.totalVolume/1000).toFixed(1)}k</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume kg</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground tabular-nums">{formatDuration(workout.durationSec)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Durée</div>
            </div>
          </div>

          {delta !== null && prev && (
            <div className={`mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{delta > 0 ? '+' : ''}{delta}% volume vs séance précédente</span>
              <span className="text-muted-foreground">({relativeDate(prev.startedAt)})</span>
            </div>
          )}
        </div>

        {/* Liste exos avec tables compactes */}
        <div className="space-y-3">
          {exos.map(ex => {
            const badge = typeBadge(ex.setType);
            const prevEx = prevExosByName.get(ex.exerciseName);

            // Map prev set par setIndex
            const prevByIdx = new Map<number, typeof ex.sets[number]>();
            if (prevEx) for (const ps of prevEx.sets) {
              const idx = ps.setIndex || 0;
              if (idx > 0) prevByIdx.set(idx, ps);
            }

            const exDelta = prevEx ? matchedSeriesDeltaPct(ex.sets, prevEx.sets) : null;
            const isTime = ex.mode === 'time';

            return (
              <div key={ex.exerciseName} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <h3 className="text-sm font-bold text-foreground flex-1 truncate">{ex.exerciseName}</h3>
                  {exDelta !== null && (
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${
                      exDelta > 0 ? 'text-success' : exDelta < 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {exDelta > 0 ? '+' : ''}{exDelta}%
                    </span>
                  )}
                </div>

                {/* Table compacte: 1 col par série + col N-1 si dispo */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead>
                      <tr className="text-[10px] uppercase text-muted-foreground/70">
                        <th className="text-left py-1 pr-2 font-medium">#</th>
                        {ex.sets.map((s, i) => (
                          <th key={i} className="py-1 px-2 font-medium">S{s.setIndex || i + 1}</th>
                        ))}
                        {prevEx && (
                          <th className="py-1 pl-3 font-medium border-l border-border/50 text-muted-foreground/50">
                            N-1
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 pr-2 text-muted-foreground text-[10px]">{isTime ? 'sec' : 'kg×reps'}</td>
                        {ex.sets.map((s, i) => (
                          <td key={i} className="py-1 px-2 text-foreground font-semibold">
                            {isTime ? `${s.duration || 0}` : `${s.weight}×${s.reps}`}
                          </td>
                        ))}
                        {prevEx && (
                          <td className="py-1 pl-3 text-muted-foreground/70 border-l border-border/50">
                            {(() => {
                              // pour N-1: prend le best set (max poids ou max reps)
                              const best = prevEx.sets.reduce((b, x) =>
                                isTime ? ((x.duration || 0) > (b.duration || 0) ? x : b)
                                       : (x.weight * x.reps > b.weight * b.reps ? x : b),
                                prevEx.sets[0]
                              );
                              return isTime ? `${best.duration || 0}s` : `${best.weight}×${best.reps}`;
                            })()}
                          </td>
                        )}
                      </tr>
                      {ex.sets.some(s => s.rpe != null) && (
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground text-[10px]">RPE</td>
                          {ex.sets.map((s, i) => (
                            <td key={i} className="py-1 px-2 text-muted-foreground">
                              {s.rpe != null ? s.rpe : '—'}
                            </td>
                          ))}
                          {prevEx && <td className="py-1 pl-3 border-l border-border/50"></td>}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mini-séries myo-rep si applicable */}
                {ex.sets.some(s => s.myoRestPauseCount) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {ex.sets.filter(s => s.myoRestPauseCount).map((s, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">
                        S{s.setIndex || i + 1}: {s.myoRestPauseCount} mini-séries
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
