import { motion } from 'framer-motion';
import { useWorkout } from '@/contexts/WorkoutContext';
import { ArrowLeft, TrendingUp, Calendar, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function History() {
  const { history, programs } = useWorkout();
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  // Get unique sessions for the workout history grouped by date
  const workoutsByDate = useMemo(() => {
    const grouped = history.reduce((acc, h) => {
      const date = h.completedAt.split('T')[0];
      const key = `${date}-${h.programId}-${h.sessionId}`;
      if (!acc[key]) {
        acc[key] = {
          date,
          programId: h.programId,
          sessionId: h.sessionId,
          sets: [],
        };
      }
      acc[key].sets.push(h);
      return acc;
    }, {} as Record<string, { date: string; programId: string; sessionId: string; sets: typeof history }>);

    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);

  // Get available sessions and exercises based on filters
  const availableSessions = useMemo(() => {
    if (selectedProgram === 'all') return [];
    const program = programs.find(p => p.id === selectedProgram);
    return program?.sessions || [];
  }, [selectedProgram, programs]);

  const availableExercises = useMemo(() => {
    if (selectedProgram === 'all') return [];
    const program = programs.find(p => p.id === selectedProgram);
    if (!program) return [];
    
    if (selectedSession === 'all') {
      return program.sessions.flatMap(s => s.exercises);
    }
    const session = program.sessions.find(s => s.id === selectedSession);
    return session?.exercises || [];
  }, [selectedProgram, selectedSession, programs]);

  // Filter history based on selections
  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (selectedProgram !== 'all' && h.programId !== selectedProgram) return false;
      if (selectedSession !== 'all' && h.sessionId !== selectedSession) return false;
      if (selectedExercise !== 'all' && h.exerciseId !== selectedExercise) return false;
      return true;
    });
  }, [history, selectedProgram, selectedSession, selectedExercise]);

  // Progression data for charts - by exercise
  const progressionByExercise = useMemo(() => {
    if (selectedExercise === 'all') return null;
    
    const exerciseHistory = filteredHistory
      .filter(h => h.exerciseId === selectedExercise)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    // Group by date and get max weight/reps for each day
    const byDate = exerciseHistory.reduce((acc, h) => {
      const date = h.completedAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, maxWeight: h.weight, totalReps: h.reps, volume: h.weight * h.reps, sets: 1 };
      } else {
        acc[date].maxWeight = Math.max(acc[date].maxWeight, h.weight);
        acc[date].totalReps += h.reps;
        acc[date].volume += h.weight * h.reps;
        acc[date].sets += 1;
      }
      return acc;
    }, {} as Record<string, { date: string; maxWeight: number; totalReps: number; volume: number; sets: number }>);

    return Object.values(byDate).map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), 'd MMM', { locale: fr }),
    }));
  }, [filteredHistory, selectedExercise]);

  // Progression data for charts - by session volume
  const progressionBySession = useMemo(() => {
    if (selectedSession === 'all' && selectedProgram === 'all') return null;
    
    const sessionHistory = filteredHistory
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    // Group by date and calculate total volume
    const byDate = sessionHistory.reduce((acc, h) => {
      const date = h.completedAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, volume: h.weight * h.reps, totalSets: 1 };
      } else {
        acc[date].volume += h.weight * h.reps;
        acc[date].totalSets += 1;
      }
      return acc;
    }, {} as Record<string, { date: string; volume: number; totalSets: number }>);

    return Object.values(byDate).map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), 'd MMM', { locale: fr }),
    }));
  }, [filteredHistory, selectedSession, selectedProgram]);

  const getSessionName = (programId: string, sessionId: string) => {
    const program = programs.find(p => p.id === programId);
    const session = program?.sessions.find(s => s.id === sessionId);
    return session?.name || 'Séance';
  };

  const getProgramName = (programId: string) => {
    return programs.find(p => p.id === programId)?.name || 'Programme';
  };

  const getExerciseName = (exerciseId: string) => {
    for (const program of programs) {
      for (const session of program.sessions) {
        const exercise = session.exercises.find(e => e.id === exerciseId);
        if (exercise) return exercise.name;
      }
    }
    return 'Exercice';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Historique</h1>
              <p className="text-xs text-muted-foreground">Progression et performances</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={selectedProgram} onValueChange={(v) => {
                setSelectedProgram(v);
                setSelectedSession('all');
                setSelectedExercise('all');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedSession} 
                onValueChange={(v) => {
                  setSelectedSession(v);
                  setSelectedExercise('all');
                }}
                disabled={selectedProgram === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Séance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les séances</SelectItem>
                  {availableSessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedExercise} 
                onValueChange={setSelectedExercise}
                disabled={selectedProgram === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Exercice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les exercices</SelectItem>
                  {availableExercises.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Tabs defaultValue="exercise" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exercise">Par exercice</TabsTrigger>
            <TabsTrigger value="session">Par séance</TabsTrigger>
          </TabsList>

          <TabsContent value="exercise" className="mt-4">
            {selectedExercise !== 'all' && progressionByExercise && progressionByExercise.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Progression - {getExerciseName(selectedExercise)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressionByExercise}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="dateLabel" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="maxWeight" 
                            name="Poids max (kg)"
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="volume" 
                            name="Volume (kg×reps)"
                            stroke="hsl(var(--success))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--success))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reps totales par séance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={progressionByExercise}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="dateLabel" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar 
                            dataKey="totalReps" 
                            name="Reps totales"
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {selectedExercise === 'all' 
                      ? 'Sélectionnez un exercice pour voir sa progression'
                      : 'Aucune donnée disponible pour cet exercice'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="session" className="mt-4">
            {progressionBySession && progressionBySession.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Volume total par séance
                      {selectedSession !== 'all' && selectedProgram !== 'all' && 
                        ` - ${getSessionName(selectedProgram, selectedSession)}`
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={progressionBySession}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="dateLabel" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="volume" 
                            name="Volume (kg×reps)"
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {selectedProgram === 'all' 
                      ? 'Sélectionnez un programme pour voir la progression par séance'
                      : 'Aucune donnée disponible'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent workouts */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Séances récentes</h2>
          
          {workoutsByDate.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun entraînement enregistré</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {workoutsByDate.slice(0, 10).map((workout, index) => (
                <motion.div
                  key={`${workout.date}-${workout.programId}-${workout.sessionId}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="card-gradient">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {getSessionName(workout.programId, workout.sessionId)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getProgramName(workout.programId)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {format(parseISO(workout.date), 'd MMMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {workout.sets.length} séries
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}