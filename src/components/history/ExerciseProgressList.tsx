import { useMemo, useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WorkoutHistory, Program } from '@/types/workout';
import { Input } from '@/components/ui/input';
import { relativeDate, getExerciseMode, matchedSeriesDeltaPct } from './historyHelpers';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface ExerciseProgressListProps {
  history: WorkoutHistory[];
  programs: Program[];
}

interface ExoStats {
  name: string;
  mode: string;
  setType: string;
  lastDate: string;
  // Série temporelle des best set par séance (+ tous les sets du jour pour calcul delta matched)
  timeline: Array<{ date: string; ts: number; weight: number; reps: number; volume: number; duration: number; allSets: WorkoutHistory[] }>;
}

function typeBadge(t: string) {
  if (t === 'myo-rep') return { label: 'MYO', cls: 'bg-orange-500/20 text-orange-400' };
  if (t === 'hypertrophie') return { label: 'HYP', cls: 'bg-blue-500/20 text-blue-400' };
  if (t === 'time') return { label: 'TEMPS', cls: 'bg-blue-500/20 text-blue-400' };
  return { label: 'FORCE', cls: 'bg-emerald-500/20 text-emerald-400' };
}

// Cards par exo: mini-chart sparkline + dernière perf + delta vs N-1.
// Tri par récence d activité. Recherche en haut.
export function ExerciseProgressList({ history, programs }: ExerciseProgressListProps) {
  const [query, setQuery] = useState('');

  const stats = useMemo<ExoStats[]>(() => {
    const byName = new Map<string, WorkoutHistory[]>();
    for (const h of history) {
      const name = h.exerciseName || '?';
      if (name === '?') continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(h);
    }

    const out: ExoStats[] = [];
    byName.forEach((entries, name) => {
      const mode = getExerciseMode(programs, entries[0].exerciseId);
      const setType = mode === 'time' ? 'time' : (entries[0].setType || 'force');

      // Group par jour de séance
      const byDay = new Map<string, WorkoutHistory[]>();
      for (const e of entries) {
        const day = e.completedAt.slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(e);
      }

      const timeline = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, sets]) => {
          // Charge tracée = poids max sur toutes les séries du jour
          //   (le plus lourd levé, indépendamment des reps)
          // Volume tracé = somme weight × reps sur toutes les séries du jour
          // Durée (mode time) = max sur toutes les séries
          const maxWeight = sets.reduce((m, x) => Math.max(m, x.weight || 0), 0);
          const maxDuration = sets.reduce((m, x) => Math.max(m, x.duration || 0), 0);
          // Reps tracées = reps de la série qui a fait le poids max (tie-break: plus de reps)
          const bestAtMaxWeight = sets
            .filter(x => x.weight === maxWeight)
            .reduce((b, x) => (x.reps > b.reps ? x : b), sets.filter(x => x.weight === maxWeight)[0]);
          return {
            date: day,
            ts: new Date(day + 'T00:00:00').getTime(),
            weight: maxWeight,
            reps: bestAtMaxWeight?.reps || 0,
            volume: sets.reduce((s, x) => s + x.weight * x.reps, 0),
            duration: maxDuration,
            allSets: sets,  // pour le calcul matched delta
          };
        });

      const lastDate = entries.reduce((max, x) => x.completedAt > max ? x.completedAt : max, entries[0].completedAt);

      out.push({ name, mode, setType, lastDate, timeline });
    });

    return out.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [history, programs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stats;
    return stats.filter(s => s.name.toLowerCase().includes(q));
  }, [stats, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filtrer un exo..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">Aucun exo ne correspond</div>
      ) : (
        filtered.map(s => {
          const badge = typeBadge(s.setType);
          const last = s.timeline[s.timeline.length - 1];
          const prev = s.timeline[s.timeline.length - 2];
          const isTime = s.mode === 'time';

          const delta = prev ? matchedSeriesDeltaPct(last.allSets, prev.allSets) : null;
          const TrendIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
          const trendColor = delta === null ? 'text-muted-foreground'
            : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

          return (
            <div key={s.name} className="p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
                <h3 className="text-sm font-bold text-foreground flex-1 truncate">{s.name}</h3>
                <span className="text-[10px] text-muted-foreground/70 shrink-0">{relativeDate(s.lastDate)}</span>
              </div>

              {s.timeline.length >= 2 && (
                <>
                  {!isTime && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80 mb-1 px-1">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-0.5 bg-primary" /> Charge
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-0.5" style={{ background: 'hsl(30 95% 60%)', borderTop: '1px dashed hsl(30 95% 60%)', height: 0 }} /> Volume
                      </span>
                    </div>
                  )}
                <div className="h-16 -mx-1 mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.timeline} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} hide />
                      <YAxis yAxisId="left" hide domain={['dataMin - 5', 'dataMax + 5']} />
                      {!isTime && <YAxis yAxisId="right" hide orientation="right" domain={['dataMin', 'dataMax']} />}
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelFormatter={(ts: number) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        formatter={(v: number, name: string) => {
                          if (name === 'Volume') return [`${v} kg`, name];
                          return [isTime ? `${v}s` : `${v}kg`, isTime ? 'Durée' : 'Charge'];
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={isTime ? 'duration' : 'weight'}
                        name={isTime ? 'Durée' : 'Charge'}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 4 }}
                      />
                      {!isTime && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="volume"
                          name="Volume"
                          stroke="hsl(30 95% 60%)"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={{ r: 1.5 }}
                          activeDot={{ r: 3 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                </>
              )}

              <div className="flex items-center justify-between text-xs tabular-nums">
                <div className="text-muted-foreground">
                  Dernière : <span className="text-foreground font-semibold">
                    {isTime ? `${last.duration}s` : `${last.weight}kg × ${last.reps}`}
                  </span>
                </div>
                {delta !== null && (
                  <div className={`flex items-center gap-0.5 font-bold ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {delta > 0 ? '+' : ''}{delta}%
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
