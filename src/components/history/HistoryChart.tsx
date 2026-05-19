import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calendar, Timer as TimerIcon, Dumbbell } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Exercise } from '@/types/workout';
import { formatDuration } from './historyHelpers';

interface WeeklyVolumePoint {
  week: string;
  Force: number;
  Hyp: number;
  Myo: number;
}

interface ChartPoint {
  sessionNum?: number;
  date?: string;
  dateLabel?: string;
  maxWeight: number;
  totalReps: number;
  totalDuration?: number;
  maxDuration?: number;
  volume: number;
  avgRpe: number | null;
}

interface ExerciseChartProps {
  data: ChartPoint[];
  xKey: string;
  xLabel: (v: unknown) => string;
}

function ExerciseChart({ data, xKey, xLabel }: ExerciseChartProps) {
  const maxWeight = Math.max(...data.map(d => d.maxWeight));
  const maxReps = Math.max(...data.map(d => d.totalReps));
  const maxDuration = Math.max(...data.map(d => d.totalDuration || 0));
  const hasDuration = data.some(d => (d.totalDuration || 0) > 0);
  const hasReps = data.some(d => d.totalReps > 0);
  const hasWeight = data.some(d => d.maxWeight > 0);

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
}

interface HistoryWeeklyChartProps {
  data: WeeklyVolumePoint[];
}

export function HistoryWeeklyChart({ data }: HistoryWeeklyChartProps) {
  if (data.length <= 1) return null;
  return (
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
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
  );
}

interface HistoryExerciseChartsProps {
  sessionExercises: Exercise[];
  exerciseChartDataBySession: Record<string, ChartPoint[]>;
  allExercisesFromHistory: Array<{ name: string; mode: string; ids: string[] }>;
  exerciseChartDataByDate: Record<string, ChartPoint[]>;
  selectedSession: string;
  selectedProgram: string;
}

export function HistoryExerciseCharts({
  sessionExercises, exerciseChartDataBySession,
  allExercisesFromHistory, exerciseChartDataByDate,
  selectedSession, selectedProgram,
}: HistoryExerciseChartsProps) {
  return (
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
                      {(exercise.mode || 'reps') === 'time' ? <TimerIcon className="h-4 w-4 text-blue-400" /> : <Dumbbell className="h-4 w-4 text-primary" />}
                      {exercise.name}
                      <span className="text-xs text-muted-foreground font-normal">({chartData.length} séances)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent><ExerciseChart data={chartData} xKey="sessionNum" xLabel={(v) => `S${v}`} /></CardContent>
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
                      {exercise.mode === 'time' ? <TimerIcon className="h-4 w-4 text-blue-400" /> : <Dumbbell className="h-4 w-4 text-primary" />}
                      {exercise.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent><ExerciseChart data={chartData} xKey="dateLabel" xLabel={(v) => String(v)} /></CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card><CardContent className="py-12 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Aucun entraînement enregistré</p></CardContent></Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

export type { ChartPoint, WeeklyVolumePoint };
