import { useMemo } from 'react';
import { format, startOfWeek, addDays, subWeeks, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GroupedWorkout, workoutMetrics } from './historyHelpers';

interface CalendarHeatmapProps {
  workouts: GroupedWorkout[];
  weeks?: number; // nombre de semaines à afficher (par défaut 12)
}

// Heatmap style GitHub: une ligne par jour de la semaine, une colonne par semaine.
// Intensité de la case = volume soulevé ce jour (relatif au max).
// Donne en un coup d œil la régularité + l intensité sans graphe complexe.
export function CalendarHeatmap({ workouts, weeks = 12 }: CalendarHeatmapProps) {
  const { grid, maxVolume } = useMemo(() => {
    // Construit la grille: weeks colonnes x 7 lignes (lundi à dimanche)
    const today = new Date();
    const start = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 });

    const byDay = new Map<string, number>();
    for (const w of workouts) {
      const dayKey = w.startedAt.slice(0, 10);
      const m = workoutMetrics(w);
      byDay.set(dayKey, (byDay.get(dayKey) || 0) + m.totalVolume);
    }
    let max = 0;
    byDay.forEach(v => { if (v > max) max = v; });

    const cols: Array<Array<{ date: Date; volume: number; isFuture: boolean }>> = [];
    for (let w = 0; w < weeks; w++) {
      const col: Array<{ date: Date; volume: number; isFuture: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        const key = format(date, 'yyyy-MM-dd');
        col.push({
          date,
          volume: byDay.get(key) || 0,
          isFuture: date > today && !isSameDay(date, today),
        });
      }
      cols.push(col);
    }
    return { grid: cols, maxVolume: max };
  }, [workouts, weeks]);

  // Intensité de couleur (5 paliers)
  const intensity = (vol: number) => {
    if (vol === 0) return 'bg-secondary/40';
    if (maxVolume === 0) return 'bg-primary/30';
    const ratio = vol / maxVolume;
    if (ratio < 0.25) return 'bg-primary/25';
    if (ratio < 0.5) return 'bg-primary/45';
    if (ratio < 0.75) return 'bg-primary/65';
    return 'bg-primary';
  };

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex flex-col gap-[3px] pt-0.5">
        {dayLabels.map((d, i) => (
          <div key={i} className="h-3 text-[9px] text-muted-foreground/50 flex items-center">
            {i % 2 === 1 ? d : ''}
          </div>
        ))}
      </div>
      <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}>
        {grid.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, di) => (
              <div
                key={di}
                className={`h-3 w-full rounded-[3px] ${cell.isFuture ? 'bg-transparent' : intensity(cell.volume)}`}
                title={`${format(cell.date, 'd MMM yyyy', { locale: fr })}${cell.volume > 0 ? ` · ${(cell.volume/1000).toFixed(1)}k kg` : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
