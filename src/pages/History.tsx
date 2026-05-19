import { useWorkout } from '@/contexts/WorkoutContext';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, subDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WorkoutHistory } from '@/types/workout';

import { formatDuration, getExerciseName, getExerciseMode } from '@/components/history/historyHelpers';
import { HistoryStats, type DashboardStats, type PRBase } from '@/components/history/HistoryStats';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryWeeklyChart, HistoryExerciseCharts, type ChartPoint, type WeeklyVolumePoint } from '@/components/history/HistoryChart';
import { HistorySessionList, type SessionComparison } from '@/components/history/HistorySessionList';

export default function History() {
  const { history, programs } = useWorkout();
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [showAllPRs, setShowAllPRs] = useState(false);

  // ==============================
  // DASHBOARD STATS
  // ==============================
  const dashboardStats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);

    const thisWeek = history.filter(h => isAfter(parseISO(h.completedAt), oneWeekAgo));
    const lastWeek = history.filter(h => {
      const d = parseISO(h.completedAt);
      return isAfter(d, twoWeeksAgo) && !isAfter(d, oneWeekAgo);
    });

    const volumeThisWeek = thisWeek.reduce((sum, h) => sum + h.weight * h.reps, 0);
    const volumeLastWeek = lastWeek.reduce((sum, h) => sum + h.weight * h.reps, 0);

    const trainingDaysThisWeek = new Set(thisWeek.map(h => h.completedAt.split('T')[0])).size;
    const trainingDaysLastWeek = new Set(lastWeek.map(h => h.completedAt.split('T')[0])).size;

    return {
      volumeThisWeek,
      volumeLastWeek,
      trainingDaysThisWeek,
      trainingDaysLastWeek,
      setsThisWeek: thisWeek.length,
      setsLastWeek: lastWeek.length,
      totalWorkouts: new Set(history.map(h => h.completedAt.split('T')[0])).size,
    };
  }, [history]);

  // ==============================
  // PERSONAL RECORDS (separated by type)
  // ==============================
  const { forcePRs, myoPRs, timePRs } = useMemo(() => {
    // Group history by exercise name + setType
    const byKey = new Map<string, WorkoutHistory[]>();

    for (const h of history) {
      const name = getExerciseName(programs, h.exerciseId, h.exerciseName);
      if (name === '?') continue;
      const type = h.setType || 'force';
      const mode = getExerciseMode(programs, h.exerciseId);
      const key = `${name}__${mode === 'time' ? 'time' : type}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(h);
    }

    const oneWeekAgo = subDays(new Date(), 7);
    const force: PRBase[] = [];
    const myo: PRBase[] = [];
    const time: PRBase[] = [];

    byKey.forEach((entries, key) => {
      const [name, type] = key.split('__');

      // For myo-rep: only consider the FIRST set per exercise per session (activation set)
      // Rest-pause sets are lighter/fewer reps by design, not meaningful for records
      let filteredEntries = entries;
      if (type === 'myo-rep') {
        const firstSetBySession = new Map<string, WorkoutHistory>();
        const sorted = [...entries].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
        for (const h of sorted) {
          const sessionKey = `${h.sessionId}__${h.exerciseId}__${h.completedAt.slice(0, 10)}`;
          if (!firstSetBySession.has(sessionKey)) {
            firstSetBySession.set(sessionKey, h);
          }
        }
        filteredEntries = Array.from(firstSetBySession.values());
      }

      let bestSetWeight = 0, bestSetReps = 0, bestSetVolume = 0, bestSetDate = '';
      let maxWeight = 0, maxWeightDate = '';
      let maxDuration = 0, maxDurationDate = '';

      for (const h of filteredEntries) {
        const vol = h.weight * h.reps;
        if (vol > bestSetVolume) {
          bestSetVolume = vol;
          bestSetWeight = h.weight;
          bestSetReps = h.reps;
          bestSetDate = h.completedAt;
        }
        if (h.weight > maxWeight) { maxWeight = h.weight; maxWeightDate = h.completedAt; }
        if ((h.duration || 0) > maxDuration) { maxDuration = h.duration || 0; maxDurationDate = h.completedAt; }
      }

      const isRecentPR = !!(bestSetDate && isAfter(parseISO(bestSetDate), oneWeekAgo)) ||
                         !!(maxWeightDate && isAfter(parseISO(maxWeightDate), oneWeekAgo)) ||
                         !!(maxDurationDate && isAfter(parseISO(maxDurationDate), oneWeekAgo));

      const pr: PRBase = {
        exerciseName: name,
        bestSetWeight, bestSetReps, bestSetVolume, bestSetDate,
        maxWeight, maxWeightDate,
        maxDuration, maxDurationDate,
        isRecentPR,
      };

      if (type === 'time') time.push(pr);
      else if (type === 'hypertrophie') force.push(pr);
      else if (type === 'myo-rep') myo.push(pr);
      else force.push(pr);
    });

    const sortPRs = (arr: PRBase[]) => arr.sort((a, b) => {
      if (a.isRecentPR && !b.isRecentPR) return -1;
      if (!a.isRecentPR && b.isRecentPR) return 1;
      return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
    });

    return { forcePRs: sortPRs(force), myoPRs: sortPRs(myo), timePRs: sortPRs(time) };
  }, [history, programs]);

  // ==============================
  // WEEKLY VOLUME CHART (by set type)
  // ==============================
  const weeklyVolumeData = useMemo<WeeklyVolumePoint[]>(() => {
    if (history.length === 0) return [];

    const byWeek = new Map<string, { week: string; force: number; hyp: number; myo: number; time: number }>();

    for (const h of history) {
      const date = parseISO(h.completedAt);
      const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      if (!byWeek.has(weekStart)) {
        byWeek.set(weekStart, { week: weekStart, force: 0, hyp: 0, myo: 0, time: 0 });
      }
      const w = byWeek.get(weekStart)!;
      const vol = h.weight * h.reps;
      const mode = getExerciseMode(programs, h.exerciseId);
      const type = mode === 'time' ? 'time' : (h.setType || 'force');

      if (type === 'time') w.time += (h.duration || 0);
      else if (type === 'hypertrophie') w.hyp += vol;
      else if (type === 'myo-rep') w.myo += vol;
      else w.force += vol;
    }

    return Array.from(byWeek.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8)
      .map(w => ({
        week: format(parseISO(w.week), 'd MMM', { locale: fr }),
        Force: Math.round(w.force),
        Hyp: Math.round(w.hyp),
        Myo: Math.round(w.myo),
      }));
  }, [history, programs]);

  // ==============================
  // SESSION COMPARISON (N vs N-1)
  // ==============================
  const sessionComparison = useMemo<SessionComparison | null>(() => {
    if (selectedSession === 'all' || selectedProgram === 'all') return null;

    const sessionHistory = history
      .filter(h => h.programId === selectedProgram && h.sessionId === selectedSession)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    if (sessionHistory.length === 0) return null;

    // Group into occurrences (gap > 30min = new session)
    const occurrences: Array<{ date: string; sets: WorkoutHistory[] }> = [];
    let current: { date: string; sets: WorkoutHistory[] } | null = null;

    for (const h of sessionHistory) {
      const ts = new Date(h.completedAt).getTime();
      if (!current) {
        current = { date: h.completedAt, sets: [h] };
      } else {
        const lastTs = new Date(current.sets[current.sets.length - 1].completedAt).getTime();
        if (ts - lastTs > 30 * 60 * 1000) {
          occurrences.push(current);
          current = { date: h.completedAt, sets: [h] };
        } else {
          current.sets.push(h);
        }
      }
    }
    if (current) occurrences.push(current);

    if (occurrences.length < 2) return null;

    const latest = occurrences[occurrences.length - 1];
    const previous = occurrences[occurrences.length - 2];

    const exerciseIds = new Set([
      ...latest.sets.map(h => h.exerciseId),
      ...previous.sets.map(h => h.exerciseId),
    ]);

    const aggregate = (sets: WorkoutHistory[]) => ({
      volume: sets.reduce((s, h) => s + h.weight * h.reps, 0),
      maxWeight: sets.length > 0 ? Math.max(...sets.map(h => h.weight)) : 0,
      totalReps: sets.reduce((s, h) => s + h.reps, 0),
      totalDuration: sets.reduce((s, h) => s + (h.duration || 0), 0),
      sets: sets.length,
      myoRestPauseCounts: sets.filter(h => h.myoRestPauseCount).map(h => h.myoRestPauseCount!),
    });

    const comparison: SessionComparison['exercises'] = [];
    exerciseIds.forEach(exId => {
      const name = getExerciseName(programs, exId);
      const mode = getExerciseMode(programs, exId);
      const curSets = latest.sets.filter(h => h.exerciseId === exId);
      const prevSets = previous.sets.filter(h => h.exerciseId === exId);
      comparison.push({
        exerciseName: name,
        mode,
        current: aggregate(curSets),
        previous: aggregate(prevSets),
      });
    });

    return {
      currentDate: format(parseISO(latest.date), 'd MMM HH:mm', { locale: fr }),
      previousDate: format(parseISO(previous.date), 'd MMM HH:mm', { locale: fr }),
      exercises: comparison,
    };
  }, [history, selectedProgram, selectedSession, programs]);

  // ==============================
  // SESSION EXERCISES + chart data
  // ==============================
  const availableSessions = useMemo(() => {
    if (selectedProgram === 'all') return [];
    const program = programs.find(p => p.id === selectedProgram);
    return program?.sessions || [];
  }, [selectedProgram, programs]);

  const sessionExercises = useMemo(() => {
    if (selectedSession === 'all' || selectedProgram === 'all') return [];
    const program = programs.find(p => p.id === selectedProgram);
    const session = program?.sessions.find(s => s.id === selectedSession);
    return session?.exercises || [];
  }, [selectedProgram, selectedSession, programs]);

  const workoutOccurrences = useMemo(() => {
    if (selectedSession === 'all' || selectedProgram === 'all') return [];
    const sessionHistory = history
      .filter(h => h.programId === selectedProgram && h.sessionId === selectedSession)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    if (sessionHistory.length === 0) return [];
    const occurrences: Array<{ date: string; sets: WorkoutHistory[] }> = [];
    let cur: { date: string; sets: WorkoutHistory[] } | null = null;
    sessionHistory.forEach(h => {
      const ts = new Date(h.completedAt).getTime();
      if (!cur) { cur = { date: h.completedAt, sets: [h] }; }
      else {
        const lastTs = new Date(cur.sets[cur.sets.length - 1].completedAt).getTime();
        if (ts - lastTs > 60 * 1000) { occurrences.push(cur); cur = { date: h.completedAt, sets: [h] }; }
        else { cur.sets.push(h); }
      }
    });
    if (cur) occurrences.push(cur);
    return occurrences;
  }, [history, selectedProgram, selectedSession]);

  const exerciseChartDataBySession = useMemo<Record<string, ChartPoint[]>>(() => {
    if (workoutOccurrences.length === 0 || sessionExercises.length === 0) return {};
    const data: Record<string, ChartPoint[]> = {};
    sessionExercises.forEach(exercise => {
      data[exercise.id] = workoutOccurrences.map((occ, idx) => {
        const sets = occ.sets.filter(s => s.exerciseId === exercise.id);
        if (sets.length === 0) return { sessionNum: idx + 1, date: occ.date, dateLabel: format(parseISO(occ.date), 'd MMM HH:mm', { locale: fr }), maxWeight: 0, totalReps: 0, totalDuration: 0, maxDuration: 0, volume: 0, avgRpe: null };
        return {
          sessionNum: idx + 1, date: occ.date,
          dateLabel: format(parseISO(occ.date), 'd MMM HH:mm', { locale: fr }),
          maxWeight: Math.max(...sets.map(s => s.weight)),
          totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
          totalDuration: sets.reduce((sum, s) => sum + (s.duration || 0), 0),
          maxDuration: Math.max(...sets.map(s => s.duration || 0)),
          volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
          avgRpe: (() => { const r = sets.filter(s => s.rpe != null); return r.length > 0 ? Math.round((r.reduce((s, h) => s + (h.rpe || 0), 0) / r.length) * 10) / 10 : null; })(),
        };
      }).filter(d => d.maxWeight > 0 || d.totalReps > 0 || (d.totalDuration || 0) > 0);
    });
    return data;
  }, [workoutOccurrences, sessionExercises]);

  const allExercisesFromHistory = useMemo(() => {
    const exerciseIds = new Set(history.map(h => h.exerciseId));
    const byName = new Map<string, { ids: string[]; name: string; mode: string }>();
    exerciseIds.forEach(id => {
      for (const p of programs) {
        for (const s of p.sessions) {
          const ex = s.exercises.find(e => e.id === id);
          if (ex) {
            const existing = byName.get(ex.name);
            if (existing) { existing.ids.push(ex.id); if (ex.mode === 'time') existing.mode = 'time'; }
            else { byName.set(ex.name, { ids: [ex.id], name: ex.name, mode: ex.mode || 'reps' }); }
            return;
          }
        }
      }
    });
    return Array.from(byName.values());
  }, [history, programs]);

  const exerciseChartDataByDate = useMemo<Record<string, ChartPoint[]>>(() => {
    if (history.length === 0) return {};
    const data: Record<string, ChartPoint[]> = {};
    allExercisesFromHistory.forEach(exercise => {
      const idSet = new Set(exercise.ids);
      const exHist = history.filter(h => idSet.has(h.exerciseId));
      const byDate = exHist.reduce((acc, h) => {
        const date = h.completedAt.split('T')[0];
        if (!acc[date]) acc[date] = { date, sets: [] };
        acc[date].sets.push(h);
        return acc;
      }, {} as Record<string, { date: string; sets: WorkoutHistory[] }>);
      data[exercise.name] = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(occ => ({
        date: occ.date,
        dateLabel: format(parseISO(occ.date), 'd MMM', { locale: fr }),
        maxWeight: Math.max(...occ.sets.map(s => s.weight)),
        totalReps: occ.sets.reduce((sum, s) => sum + s.reps, 0),
        totalDuration: occ.sets.reduce((sum, s) => sum + (s.duration || 0), 0),
        maxDuration: Math.max(...occ.sets.map(s => s.duration || 0)),
        volume: occ.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
        avgRpe: (() => { const r = occ.sets.filter(s => s.rpe != null); return r.length > 0 ? Math.round((r.reduce((s, h) => s + (h.rpe || 0), 0) / r.length) * 10) / 10 : null; })(),
      }));
    });
    return data;
  }, [history, allExercisesFromHistory]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Historique</h1>
              <p className="text-xs text-muted-foreground">{dashboardStats.totalWorkouts} séances enregistrées</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <HistoryStats
          stats={dashboardStats}
          forcePRs={forcePRs}
          myoPRs={myoPRs}
          timePRs={timePRs}
          showAllPRs={showAllPRs}
          onToggleShowAllPRs={() => setShowAllPRs(!showAllPRs)}
          formatDuration={formatDuration}
        />

        <HistoryWeeklyChart data={weeklyVolumeData} />

        <HistoryFilters
          programs={programs}
          selectedProgram={selectedProgram}
          selectedSession={selectedSession}
          availableSessions={availableSessions}
          onChangeProgram={(v) => { setSelectedProgram(v); setSelectedSession('all'); }}
          onChangeSession={setSelectedSession}
        />

        <HistorySessionList comparison={sessionComparison} />

        <HistoryExerciseCharts
          sessionExercises={sessionExercises}
          exerciseChartDataBySession={exerciseChartDataBySession}
          allExercisesFromHistory={allExercisesFromHistory}
          exerciseChartDataByDate={exerciseChartDataByDate}
          selectedSession={selectedSession}
          selectedProgram={selectedProgram}
        />
      </main>
    </div>
  );
}
