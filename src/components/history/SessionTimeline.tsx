import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Program } from '@/types/workout';
import { GroupedWorkout, workoutMetrics, findPreviousComparable, formatDuration } from './historyHelpers';

interface SessionTimelineProps {
  workouts: GroupedWorkout[];
  programs: Program[];
}

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "AUJOURD'HUI";
  if (isYesterday(d)) return 'HIER';
  return format(d, 'EEEE d MMMM', { locale: fr }).toUpperCase();
}

function sessionName(programs: Program[], programId: string, sessionId: string): { program: string; session: string } {
  const p = programs.find(x => x.id === programId);
  const s = p?.sessions.find(x => x.id === sessionId);
  return { program: p?.name || '?', session: s?.name || 'Séance' };
}

// Liste chronologique inverse des séances, groupées par jour.
// Chaque card est un résumé tappable → drill-down vers /history/session/:id.
export function SessionTimeline({ workouts, programs }: SessionTimelineProps) {
  const navigate = useNavigate();

  const byDay = useMemo(() => {
    const m = new Map<string, GroupedWorkout[]>();
    for (const w of workouts) {
      const key = w.startedAt.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(w);
    }
    return Array.from(m.entries()); // déjà desc grâce à workouts trié desc
  }, [workouts]);

  if (workouts.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-8">Aucune séance enregistrée</div>;
  }

  return (
    <div className="space-y-5">
      {byDay.map(([day, dayWorkouts]) => (
        <div key={day}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 px-1">
            {dayLabel(day)}
          </div>
          <div className="space-y-2">
            {dayWorkouts.map(w => {
              const m = workoutMetrics(w);
              const { prev, delta } = findPreviousComparable(workouts, w.id);
              const { program, session } = sessionName(programs, w.programId, w.sessionId);
              const time = format(parseISO(w.startedAt), 'HH:mm');

              const trendColor = delta === null ? 'text-muted-foreground'
                : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';
              const TrendIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => navigate(`/history/session/${encodeURIComponent(w.id)}`)}
                  className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-foreground truncate">{session}</span>
                        <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">{time}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-1.5 truncate">{program}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                        <span>{m.totalSets} séries</span>
                        <span>·</span>
                        <span>{m.uniqueExercises} exos</span>
                        {m.totalVolume > 0 && (
                          <>
                            <span>·</span>
                            <span>{(m.totalVolume/1000).toFixed(1)}k kg</span>
                          </>
                        )}
                        {m.totalDurationSec > 0 && (
                          <>
                            <span>·</span>
                            <span>{formatDuration(m.totalDurationSec)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {delta !== null && (
                        <div className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                          {delta > 0 ? '+' : ''}{delta}%
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
