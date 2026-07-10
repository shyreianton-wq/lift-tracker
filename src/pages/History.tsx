import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Columns2, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkout } from '@/contexts/WorkoutContext';
import { subDays, isAfter, parseISO } from 'date-fns';
import { groupIntoWorkouts, workoutMetrics } from '@/components/history/historyHelpers';
import { CalendarHeatmap } from '@/components/history/CalendarHeatmap';
import { SessionTimeline } from '@/components/history/SessionTimeline';
import { ExerciseProgressList } from '@/components/history/ExerciseProgressList';
import { RecordsList } from '@/components/history/RecordsList';
import { RecoverySheet } from '@/components/RecoverySheet';

type LayoutKey = 'A' | 'B';
const LS_KEY = 'history_layout_pref';

export default function History() {
  const { history, programs } = useWorkout();
  const navigate = useNavigate();

  // Toggle layout A (3 onglets) vs B (2 onglets). Persisté en localStorage.
  const [layout, setLayout] = useState<LayoutKey>('A');
  const [recoverOpen, setRecoverOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'A' || saved === 'B') setLayout(saved);
  }, []);
  const setLayoutPersist = (v: LayoutKey) => { setLayout(v); localStorage.setItem(LS_KEY, v); };

  const workouts = useMemo(() => groupIntoWorkouts(history), [history]);

  // Sous-titre: stats compactes cette semaine
  const subStats = useMemo(() => {
    const weekAgo = subDays(new Date(), 7);
    const twoWeeksAgo = subDays(new Date(), 14);
    const thisWeek = history.filter(h => isAfter(parseISO(h.completedAt), weekAgo));
    const lastWeek = history.filter(h => {
      const d = parseISO(h.completedAt);
      return isAfter(d, twoWeeksAgo) && !isAfter(d, weekAgo);
    });
    const vol = thisWeek.reduce((s, h) => s + h.weight * h.reps, 0);
    const volPrev = lastWeek.reduce((s, h) => s + h.weight * h.reps, 0);
    const delta = volPrev > 0 ? Math.round(((vol - volPrev) / volPrev) * 100) : null;
    return {
      totalWorkouts: workouts.length,
      volWeek: Math.round(vol / 100) / 10, // en k arrondi 1 décimale
      delta,
    };
  }, [history, workouts.length]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground leading-tight">Historique</h1>
                <p className="text-[11px] text-muted-foreground truncate tabular-nums">
                  {subStats.totalWorkouts} séances · {subStats.volWeek}k kg cette sem
                  {subStats.delta !== null && (
                    <span className={subStats.delta > 0 ? 'text-success' : subStats.delta < 0 ? 'text-destructive' : ''}>
                      {' '}({subStats.delta > 0 ? '+' : ''}{subStats.delta}%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRecoverOpen(true)}
              className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="Rattraper une séance mal enregistrée"
            >
              <LifeBuoy className="h-4 w-4" />
            </button>
            {/* Toggle layout A/B */}
            <div className="flex items-center rounded-full bg-secondary p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setLayoutPersist('A')}
                className={`flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                  layout === 'A' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
                }`}
                title="3 onglets séparés"
              >
                <LayoutGrid className="h-3 w-3" /> A
              </button>
              <button
                type="button"
                onClick={() => setLayoutPersist('B')}
                className={`flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                  layout === 'B' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
                }`}
                title="2 onglets"
              >
                <Columns2 className="h-3 w-3" /> B
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* Bandeau heatmap calendrier (remplace le bar chart) */}
        <div className="p-3 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              12 dernières semaines
            </span>
            <span className="text-[10px] text-muted-foreground/70">moins → plus</span>
          </div>
          <CalendarHeatmap workouts={workouts} weeks={12} />
        </div>

        {layout === 'A' ? (
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions">Séances</TabsTrigger>
              <TabsTrigger value="exos">Exos</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>
            <TabsContent value="sessions" className="mt-4">
              <SessionTimeline workouts={workouts} programs={programs} />
            </TabsContent>
            <TabsContent value="exos" className="mt-4">
              <ExerciseProgressList history={history} programs={programs} />
            </TabsContent>
            <TabsContent value="records" className="mt-4">
              <RecordsList history={history} programs={programs} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sessions">Séances</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>
            <TabsContent value="sessions" className="mt-4 space-y-4">
              <SessionTimeline workouts={workouts} programs={programs} />
              <div className="pt-4 border-t border-border/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  Toutes les progressions par exo
                </div>
                <ExerciseProgressList history={history} programs={programs} />
              </div>
            </TabsContent>
            <TabsContent value="records" className="mt-4">
              <RecordsList history={history} programs={programs} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
