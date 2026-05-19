import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Dumbbell, TrendingUp, Trophy } from 'lucide-react';

interface DashboardStats {
  volumeThisWeek: number;
  volumeLastWeek: number;
  trainingDaysThisWeek: number;
  trainingDaysLastWeek: number;
  setsThisWeek: number;
  setsLastWeek: number;
  totalWorkouts: number;
}

interface PRBase {
  exerciseName: string;
  bestSetWeight: number;
  bestSetReps: number;
  bestSetVolume: number;
  bestSetDate: string;
  maxWeight: number;
  maxWeightDate: string;
  maxDuration: number;
  maxDurationDate: string;
  isRecentPR: boolean;
}

type PRType = 'force' | 'myo' | 'time';

interface DeltaProps {
  current: number;
  previous: number;
  suffix?: string;
  invert?: boolean;
}

function Delta({ current, previous, suffix = '', invert = false }: DeltaProps) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const isUp = invert ? diff < 0 : diff > 0;
  const isDown = invert ? diff > 0 : diff < 0;
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-success' : isDown ? 'text-destructive' : 'text-muted-foreground'}`}>
      {diff > 0 ? '+' : ''}{pct}%{suffix}
    </span>
  );
}

interface HistoryStatsProps {
  stats: DashboardStats;
  forcePRs: PRBase[];
  myoPRs: PRBase[];
  timePRs: PRBase[];
  showAllPRs: boolean;
  onToggleShowAllPRs: () => void;
  formatDuration: (s: number) => string;
}

export function HistoryStats({
  stats, forcePRs, myoPRs, timePRs,
  showAllPRs, onToggleShowAllPRs, formatDuration,
}: HistoryStatsProps) {
  const allPRs = [
    ...forcePRs.map(pr => ({ ...pr, _type: 'force' as PRType })),
    ...myoPRs.map(pr => ({ ...pr, _type: 'myo' as PRType })),
    ...timePRs.map(pr => ({ ...pr, _type: 'time' as PRType })),
  ].sort((a, b) => {
    if (a.isRecentPR && !b.isRecentPR) return -1;
    if (!a.isRecentPR && b.isRecentPR) return 1;
    return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
  });

  const totalPRs = forcePRs.length + myoPRs.length + timePRs.length;
  const visiblePRs = allPRs.slice(0, showAllPRs ? undefined : 6);

  return (
    <>
      {/* Dashboard cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <Flame className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.trainingDaysThisWeek}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Jours cette sem.</div>
            <Delta current={stats.trainingDaysThisWeek} previous={stats.trainingDaysLastWeek} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.setsThisWeek}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Séries cette sem.</div>
            <Delta current={stats.setsThisWeek} previous={stats.setsLastWeek} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{(stats.volumeThisWeek / 1000).toFixed(1)}k</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume (kg)</div>
            <Delta current={stats.volumeThisWeek} previous={stats.volumeLastWeek} />
          </CardContent>
        </Card>
      </div>

      {/* Personal records */}
      {totalPRs > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Records personnels
              </CardTitle>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                bordure = PR cette semaine
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {visiblePRs.map((pr) => (
              <div key={`${pr._type}-${pr.exerciseName}`}
                className={`flex items-center justify-between p-2 rounded-lg ${pr.isRecentPR ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-secondary/30'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {pr.isRecentPR && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    pr._type === 'force' ? 'bg-green-500/20 text-green-400' :
                    pr._type === 'myo' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {pr._type === 'force' ? 'FORCE' : pr._type === 'myo' ? 'MYO' : 'TEMPS'}
                  </span>
                  <span className="font-medium text-sm truncate">{pr.exerciseName}</span>
                </div>
                <div className="shrink-0 ml-2 text-right">
                  {pr._type === 'time' ? (
                    <span className="text-xs font-semibold text-blue-400">{formatDuration(pr.maxDuration)}</span>
                  ) : (
                    <span className={`text-xs font-semibold ${pr._type === 'force' ? 'text-green-400' : pr._type === 'myo' ? 'text-orange-400' : 'text-blue-400'}`}>
                      {pr.bestSetWeight > 0 && pr.bestSetReps > 0
                        ? `${pr.bestSetWeight}kg × ${pr.bestSetReps}`
                        : pr.bestSetReps > 0
                        ? `${pr.bestSetReps} reps`
                        : pr.bestSetWeight > 0
                        ? `${pr.bestSetWeight}kg`
                        : pr.maxDuration > 0
                        ? formatDuration(pr.maxDuration)
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {totalPRs > 6 && (
              <button onClick={onToggleShowAllPRs}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
                {showAllPRs ? 'Voir moins' : `Voir les ${totalPRs - 6} autres`}
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export type { DashboardStats, PRBase };
