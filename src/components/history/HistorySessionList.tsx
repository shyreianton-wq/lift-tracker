import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDuration } from './historyHelpers';

interface ExerciseComparison {
  exerciseName: string;
  mode: string;
  current: {
    volume: number;
    maxWeight: number;
    totalReps: number;
    totalDuration: number;
    sets: number;
    myoRestPauseCounts?: number[];
  };
  previous: {
    volume: number;
    maxWeight: number;
    totalReps: number;
    totalDuration: number;
    sets: number;
    myoRestPauseCounts?: number[];
  };
}

interface SessionComparison {
  currentDate: string;
  previousDate: string;
  exercises: ExerciseComparison[];
}

interface HistorySessionListProps {
  comparison: SessionComparison | null;
}

export function HistorySessionList({ comparison }: HistorySessionListProps) {
  if (!comparison) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Comparaison : {comparison.currentDate} vs {comparison.previousDate}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {comparison.exercises.map(ex => {
            const isTime = ex.mode === 'time';
            const cur = ex.current;
            const prev = ex.previous;

            let indicator;
            if (isTime) {
              indicator = cur.totalDuration > prev.totalDuration ? <TrendingUp className="h-4 w-4 text-success" /> :
                          cur.totalDuration < prev.totalDuration ? <TrendingDown className="h-4 w-4 text-destructive" /> :
                          <Minus className="h-4 w-4 text-muted-foreground" />;
            } else {
              const curVol = cur.volume;
              const prevVol = prev.volume;
              indicator = curVol > prevVol ? <TrendingUp className="h-4 w-4 text-success" /> :
                          curVol < prevVol ? <TrendingDown className="h-4 w-4 text-destructive" /> :
                          <Minus className="h-4 w-4 text-muted-foreground" />;
            }

            return (
              <div key={ex.exerciseName} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {indicator}
                  <span className="text-sm font-medium">{ex.exerciseName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {isTime ? (
                    <>
                      <span className="text-muted-foreground">{formatDuration(prev.totalDuration)}</span>
                      <span className="text-foreground font-semibold">→ {formatDuration(cur.totalDuration)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{prev.maxWeight}kg×{prev.totalReps}</span>
                      <span className="text-foreground font-semibold">→ {cur.maxWeight}kg×{cur.totalReps}</span>
                    </>
                  )}
                </div>
                {/* Myo-rep mini-series count */}
                {cur.myoRestPauseCounts && cur.myoRestPauseCounts.length > 0 && (
                  <div className="mt-1 ml-6 flex items-center gap-1.5">
                    {cur.myoRestPauseCounts.map((count: number, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">
                        {count} mini-séries
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export type { SessionComparison, ExerciseComparison };
