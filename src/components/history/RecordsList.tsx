import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { WorkoutHistory, Program } from '@/types/workout';
import { getExerciseMode, relativeDate } from './historyHelpers';

interface RecordsListProps {
  history: WorkoutHistory[];
  programs: Program[];
}

type FilterKey = 'all' | 'force' | 'hypertrophie' | 'myo-rep' | 'time';

interface PR {
  exerciseName: string;
  type: 'force' | 'hypertrophie' | 'myo-rep' | 'time';
  bestWeight: number;
  bestReps: number;
  bestDuration: number;
  date: string;
  isRecent: boolean;
}

function typeBadge(t: string) {
  if (t === 'myo-rep') return { label: 'MYO', cls: 'bg-orange-500/20 text-orange-400', filter: 'myo-rep' };
  if (t === 'hypertrophie') return { label: 'HYP', cls: 'bg-blue-500/20 text-blue-400', filter: 'hypertrophie' };
  if (t === 'time') return { label: 'TEMPS', cls: 'bg-blue-500/20 text-blue-400', filter: 'time' };
  return { label: 'FORCE', cls: 'bg-emerald-500/20 text-emerald-400', filter: 'force' };
}

export function RecordsList({ history, programs }: RecordsListProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const prs = useMemo<PR[]>(() => {
    const byKey = new Map<string, WorkoutHistory[]>();
    for (const h of history) {
      const name = h.exerciseName || '?';
      if (name === '?') continue;
      const mode = getExerciseMode(programs, h.exerciseId);
      const type = mode === 'time' ? 'time' : (h.setType || 'force');
      const key = `${name}__${type}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(h);
    }

    const weekAgo = Date.now() - 7 * 86400000;
    const out: PR[] = [];

    byKey.forEach((entries, key) => {
      const [name, type] = key.split('__');
      // Pour myo-rep: filtrer sur le 1er set de chaque séance (activation)
      let pool = entries;
      if (type === 'myo-rep') {
        const firstBySession = new Map<string, WorkoutHistory>();
        const sorted = [...entries].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
        for (const h of sorted) {
          const k = `${h.sessionId}__${h.exerciseId}__${h.completedAt.slice(0, 10)}`;
          if (!firstBySession.has(k)) firstBySession.set(k, h);
        }
        pool = Array.from(firstBySession.values());
      }

      // PR = meilleur volume (poids × reps) ou meilleure durée selon mode
      let best = pool[0];
      let bestScore = type === 'time' ? (best.duration || 0) : best.weight * best.reps;
      for (const e of pool) {
        const score = type === 'time' ? (e.duration || 0) : e.weight * e.reps;
        if (score > bestScore) { best = e; bestScore = score; }
      }

      out.push({
        exerciseName: name,
        type: type as PR['type'],
        bestWeight: best.weight,
        bestReps: best.reps,
        bestDuration: best.duration || 0,
        date: best.completedAt,
        isRecent: new Date(best.completedAt).getTime() > weekAgo,
      });
    });

    return out.sort((a, b) => {
      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;
      return b.date.localeCompare(a.date);
    });
  }, [history, programs]);

  const filtered = prs.filter(p => filter === 'all' || p.type === filter);

  const filterChips: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'Tous' },
    { key: 'force', label: 'Force' },
    { key: 'hypertrophie', label: 'Hyp' },
    { key: 'myo-rep', label: 'Myo' },
    { key: 'time', label: 'Temps' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {filterChips.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === c.key ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">Aucun record</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(pr => {
            const badge = typeBadge(pr.type);
            return (
              <div
                key={`${pr.type}-${pr.exerciseName}`}
                className={`p-3 rounded-xl border ${
                  pr.isRecent ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {pr.isRecent && <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <h3 className="text-sm font-bold text-foreground flex-1 truncate">{pr.exerciseName}</h3>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0">{relativeDate(pr.date)}</span>
                </div>
                <div className="text-base font-bold text-foreground tabular-nums">
                  {pr.type === 'time'
                    ? `${pr.bestDuration}s`
                    : `${pr.bestWeight}kg × ${pr.bestReps}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
