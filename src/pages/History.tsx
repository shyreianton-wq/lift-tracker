import { motion } from 'framer-motion';
import { useWorkout } from '@/contexts/WorkoutContext';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Dumbbell, BarChart3, Timer, Trophy, Flame, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfWeek, subDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

// ==============================
// Helpers
// ==============================
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getExerciseName(programs: any[], exerciseId: string, storedName?: string): string {
  // Prefer stored name (has resolved rotation name)
  if (storedName) return storedName;
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) {
          // For rotation slots, check if we can resolve from group
          if (e.rotationGroupRef) {
            const rg = p.rotationGroups?.find((g: any) => g.id === e.rotationGroupRef);
            if (rg) return '🔄 ' + rg.name;
          }
          return e.name;
        }
      }
    }
  }
  return '?';
}

function getExerciseMode(programs: any[], exerciseId: string): string {
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) return e.mode || 'reps';
      }
    }
  }
  return 'reps';
}

export default function History() {
  const { history, programs } = useWorkout();
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [showAllPRs, setShowAllPRs] = useState(false);

  // ==============================
  // DASHBOARD STATS
  // ==============================
  const dashboardStats = useMemo(() => {
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
    const volumeDelta = volumeLastWeek > 0 ? ((volumeThisWeek - volumeLastWeek) / volumeLastWeek) * 100 : 0;

    // Count unique training days this week
    const trainingDaysThisWeek = new Set(thisWeek.map(h => h.completedAt.split('T')[0])).size;
    const trainingDaysLastWeek = new Set(lastWeek.map(h => h.completedAt.split('T')[0])).size;

    // Total sets this week
    const setsThisWeek = thisWeek.length;
    const setsLastWeek = lastWeek.length;

    return {
      volumeThisWeek,
      volumeLastWeek,
      volumeDelta,
      trainingDaysThisWeek,
      trainingDaysLastWeek,
      setsThisWeek,
      setsLastWeek,
      totalWorkouts: new Set(history.map(h => h.completedAt.split('T')[0])).size,
    };
  }, [history]);

  // ==============================
  // PERSONAL RECORDS (separated by type)
  // ==============================
  const { forcePRs, myoPRs, timePRs } = useMemo(() => {
    // Group history by exercise name + setType
    const byKey = new Map<string, typeof history>();
    
    for (const h of history) {
      const name = getExerciseName(programs, h.exerciseId, h.exerciseName);
      if (name === '?') continue;
      const type = h.setType || 'force';
      const mode = getExerciseMode(programs, h.exerciseId);
      const key = `${name}__${mode === 'time' ? 'time' : type}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(h);
    }

    type PR = {
      exerciseName: string;
      type: 'force' | 'hypertrophie' | 'myo-rep' | 'time';
      // Force: best set = highest weight×reps product
      bestSetWeight: number;
      bestSetReps: number;
      bestSetVolume: number;
      bestSetDate: string;
      // Myo: max weight used (fatigue set weight)
      maxWeight: number;
      maxWeightDate: string;
      // Time: max duration
      maxDuration: number;
      maxDurationDate: string;
      isRecentPR: boolean;
    };

    const oneWeekAgo = subDays(new Date(), 7);
    const force: PR[] = [];
    const myo: PR[] = [];
    const time: PR[] = [];

    byKey.forEach((entries, key) => {
      const [name, type] = key.split('__');

      // For myo-rep: only consider the FIRST set per exercise per session (activation set)
      // Rest-pause sets are lighter/fewer reps by design, not meaningful for records
      let filteredEntries = entries;
      if (type === 'myo-rep') {
        const firstSetBySession = new Map<string, typeof entries[0]>();
        // Sort by completedAt ascending, then keep only the first per session+exercise
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

      const isRecentPR = (bestSetDate && isAfter(parseISO(bestSetDate), oneWeekAgo)) ||
                          (maxWeightDate && isAfter(parseISO(maxWeightDate), oneWeekAgo)) ||
                          (maxDurationDate && isAfter(parseISO(maxDurationDate), oneWeekAgo));

      const pr: PR = {
        exerciseName: name, type: type as any,
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

    const sortPRs = (arr: PR[]) => arr.sort((a, b) => {
      if (a.isRecentPR && !b.isRecentPR) return -1;
      if (!a.isRecentPR && b.isRecentPR) return 1;
      return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
    });

    return { forcePRs: sortPRs(force), myoPRs: sortPRs(myo), timePRs: sortPRs(time) };
  }, [history, programs]);

  // ==============================
  // WEEKLY VOLUME CHART (by set type: force/myo/time)
  // ==============================
  const weeklyVolumeData = useMemo(() => {
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
  const sessionComparison = useMemo(() => {
    if (selectedSession === 'all' || selectedProgram === 'all') return null;

    const sessionHistory = history
      .filter(h => h.programId === selectedProgram && h.sessionId === selectedSession)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    if (sessionHistory.length === 0) return null;

    // Group into occurrences (gap > 30min = new session)
    const occurrences: Array<{ date: string; sets: typeof history }> = [];
    let current: { date: string; sets: typeof history } | null = null;

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

    // Build comparison by exercise
    const exerciseIds = new Set([
      ...latest.sets.map(h => h.exerciseId),
      ...previous.sets.map(h => h.exerciseId),
    ]);

    const comparison: Array<{
      exerciseName: string;
      mode: string;
      current: { volume: number; maxWeight: number; totalReps: number; totalDuration: number; sets: number };
      previous: { volume: number; maxWeight: number; totalReps: number; totalDuration: number; sets: number };
    }> = [];

    exerciseIds.forEach(exId => {
      const name = getExerciseName(programs, exId);
      const mode = getExerciseMode(programs, exId);
      const curSets = latest.sets.filter(h => h.exerciseId === exId);
      const prevSets = previous.sets.filter(h => h.exerciseId === exId);

      const aggregate = (sets: typeof history) => ({
        volume: sets.reduce((s, h) => s + h.weight * h.reps, 0),
        maxWeight: sets.length > 0 ? Math.max(...sets.map(h => h.weight)) : 0,
        totalReps: sets.reduce((s, h) => s + h.reps, 0),
        totalDuration: sets.reduce((s, h) => s + (h.duration || 0), 0),
        sets: sets.length,
        myoRestPauseCounts: sets.filter(h => h.myoRestPauseCount).map(h => h.myoRestPauseCount!),
      });

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
  // EXISTING: session exercises, chart data, etc.
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
    const occurrences: Array<{ date: string; sets: typeof history }> = [];
    let cur: { date: string; sets: typeof history } | null = null;
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

  const exerciseChartDataBySession = useMemo(() => {
    if (workoutOccurrences.length === 0 || sessionExercises.length === 0) return {};
    const data: Record<string, any[]> = {};
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

  const exerciseChartDataByDate = useMemo(() => {
    if (history.length === 0) return {};
    const data: Record<string, any[]> = {};
    allExercisesFromHistory.forEach(exercise => {
      const idSet = new Set(exercise.ids);
      const exHist = history.filter(h => idSet.has(h.exerciseId));
      const byDate = exHist.reduce((acc, h) => {
        const date = h.completedAt.split('T')[0];
        if (!acc[date]) acc[date] = { date, sets: [] };
        acc[date].sets.push(h);
        return acc;
      }, {} as Record<string, { date: string; sets: typeof history }>);
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

  // ==============================
  // CHART COMPONENT
  // ==============================
  const ExerciseChart = ({ data, xKey, xLabel, mode = 'reps' }: { data: any[]; xKey: string; xLabel: (v: any) => string; mode?: string }) => {
    const maxWeight = Math.max(...data.map((d: any) => d.maxWeight));
    const maxReps = Math.max(...data.map((d: any) => d.totalReps));
    const maxDuration = Math.max(...data.map((d: any) => d.totalDuration || 0));
    const hasDuration = data.some((d: any) => (d.totalDuration || 0) > 0);
    const hasReps = data.some((d: any) => d.totalReps > 0);
    const hasWeight = data.some((d: any) => d.maxWeight > 0);

    return (
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 40, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={xLabel} />
            <YAxis yAxisId="rpe" orientation="right" stroke="#ef4444" fontSize={10} width={30} domain={[0, 10]} ticks={[6, 7, 8, 9, 10]} />
            {hasWeight && <YAxis yAxisId="weight" orientation="left" stroke="hsl(var(--primary))" fontSize={10} width={45} domain={[0, Math.ceil(maxWeight * 1.1) || 10]} tickFormatter={(v) => `${v}kg`} />}
            {hasReps && <YAxis yAxisId="reps" orientation={hasWeight ? "right" : "left"} stroke="hsl(var(--success))" fontSize={10} width={40} domain={[0, Math.ceil(maxReps * 1.1) || 10]} tickFormatter={(v) => `${v}r`} />}
            {hasDuration && <YAxis yAxisId="duration" orientation={hasWeight || hasReps ? "right" : "left"} stroke="#3b82f6" fontSize={10} width={45} domain={[0, Math.ceil(maxDuration * 1.1) || 60]} tickFormatter={(v) => formatDuration(v)} />}
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number, name: string) => {
                if (name === 'RPE') return [value?.toFixed(1), name];
                if (name === 'Poids') return [`${value} kg`, name];
                if (name === 'Durée') return [formatDuration(value || 0), name];
                return [value, name];
              }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {hasWeight && <Line yAxisId="weight" type="monotone" dataKey="maxWeight" name="Poids" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} connectNulls />}
            {hasReps && <Line yAxisId="reps" type="monotone" dataKey="totalReps" name="Reps" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))', r: 3 }} connectNulls />}
            {hasDuration && <Line yAxisId="duration" type="monotone" dataKey="totalDuration" name="Durée" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} connectNulls />}
            <Line yAxisId="rpe" type="monotone" dataKey="avgRpe" name="RPE" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Delta indicator
  const Delta = ({ current, previous, suffix = '', invert = false }: { current: number; previous: number; suffix?: string; invert?: boolean }) => {
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
  };

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

        {/* ===== DASHBOARD STATS ===== */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-3 text-center">
              <Flame className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{dashboardStats.trainingDaysThisWeek}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Jours cette sem.</div>
              <Delta current={dashboardStats.trainingDaysThisWeek} previous={dashboardStats.trainingDaysLastWeek} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-3 text-center">
              <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{dashboardStats.setsThisWeek}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Séries cette sem.</div>
              <Delta current={dashboardStats.setsThisWeek} previous={dashboardStats.setsLastWeek} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-3 text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{(dashboardStats.volumeThisWeek / 1000).toFixed(1)}k</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume (kg)</div>
              <Delta current={dashboardStats.volumeThisWeek} previous={dashboardStats.volumeLastWeek} />
            </CardContent>
          </Card>
        </div>

        {/* ===== WEEKLY VOLUME CHART ===== */}
        {weeklyVolumeData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Volume hebdomadaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyVolumeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [`${value.toLocaleString()} kg`, name]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Force" stackId="volume" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Myo" stackId="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== PERSONAL RECORDS ===== */}
        {(forcePRs.length > 0 || myoPRs.length > 0 || timePRs.length > 0) && (
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
              {/* All PRs in a single list with badges */}
              {[
                ...forcePRs.map(pr => ({ ...pr, _type: 'force' as const })),
                ...myoPRs.map(pr => ({ ...pr, _type: 'myo' as const })),
                ...timePRs.map(pr => ({ ...pr, _type: 'time' as const })),
              ]
                .sort((a, b) => {
                  if (a.isRecentPR && !b.isRecentPR) return -1;
                  if (!a.isRecentPR && b.isRecentPR) return 1;
                  return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
                })
                .slice(0, showAllPRs ? undefined : 6)
                .map((pr, i) => (
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
              {(forcePRs.length + myoPRs.length + timePRs.length) > 6 && (
                <button onClick={() => setShowAllPRs(!showAllPRs)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
                  {showAllPRs ? 'Voir moins' : `Voir les ${forcePRs.length + myoPRs.length + timePRs.length - 6} autres`}
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== FILTERS ===== */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedProgram} onValueChange={(v) => { setSelectedProgram(v); setSelectedSession('all'); }}>
                <SelectTrigger><SelectValue placeholder="Programme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSession} onValueChange={setSelectedSession} disabled={selectedProgram === 'all'}>
                <SelectTrigger><SelectValue placeholder="Séance" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les séances</SelectItem>
                  {availableSessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ===== SESSION COMPARISON N vs N-1 ===== */}
        {sessionComparison && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Comparaison : {sessionComparison.currentDate} vs {sessionComparison.previousDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessionComparison.exercises.map(ex => {
                  const isTime = ex.mode === 'time';
                  const cur = ex.current;
                  const prev = ex.previous;
                  
                  let indicator = null;
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
        )}

        {/* ===== EXERCISE CHARTS ===== */}
        <Tabs defaultValue="session" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="session"><BarChart3 className="h-4 w-4 mr-1" />Par séance</TabsTrigger>
            <TabsTrigger value="time"><Calendar className="h-4 w-4 mr-1" />Par date</TabsTrigger>
          </TabsList>

          <TabsContent value="session" className="mt-4 space-y-4">
            {selectedSession !== 'all' && selectedProgram !== 'all' && sessionExercises.length > 0 ? (
              sessionExercises.map((exercise, idx) => {
                const chartData = exerciseChartDataBySession[exercise.id] || [];
                if (chartData.length === 0) return null;
                return (
                  <motion.div key={exercise.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {(exercise.mode || 'reps') === 'time' ? <Timer className="h-4 w-4 text-blue-400" /> : <Dumbbell className="h-4 w-4 text-primary" />}
                          {exercise.name}
                          <span className="text-xs text-muted-foreground font-normal">({chartData.length} séances)</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent><ExerciseChart data={chartData} xKey="sessionNum" xLabel={(v) => `S${v}`} mode={exercise.mode || 'reps'} /></CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <Card><CardContent className="py-12 text-center"><BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Sélectionnez un programme et une séance</p></CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="time" className="mt-4 space-y-4">
            {allExercisesFromHistory.length > 0 ? (
              allExercisesFromHistory.map((exercise, idx) => {
                const chartData = exerciseChartDataByDate[exercise.name] || [];
                if (chartData.length === 0) return null;
                return (
                  <motion.div key={exercise.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {exercise.mode === 'time' ? <Timer className="h-4 w-4 text-blue-400" /> : <Dumbbell className="h-4 w-4 text-primary" />}
                          {exercise.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent><ExerciseChart data={chartData} xKey="dateLabel" xLabel={(v) => v} mode={exercise.mode} /></CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <Card><CardContent className="py-12 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Aucun entraînement enregistré</p></CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
