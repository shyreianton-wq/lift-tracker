import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Timer } from '@/components/Timer';
import { ExerciseCard } from '@/components/ExerciseCard';
import { useState, useMemo } from 'react';
import { WorkoutSet, Exercise } from '@/types/workout';

export default function TrainingSession() {
  const { programId, sessionId } = useParams();
  const navigate = useNavigate();
  const { programs, activeWorkout, completeSet, endWorkout, getLastPerformance } = useWorkout();
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseSets, setExerciseSets] = useState<Record<string, Record<string, WorkoutSet>>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const program = programs.find(p => p.id === programId);
  const session = program?.sessions.find(s => s.id === sessionId);

  const exercises = useMemo(() => {
    if (!session) return [];
    return session.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => {
        const completedSet = exerciseSets[ex.id]?.[set.id];
        return completedSet || set;
      }),
    }));
  }, [session, exerciseSets]);

  const currentExercise = exercises[currentExerciseIndex];

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const allSetsCompleted = completedSets === totalSets && totalSets > 0;

  if (!program || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Séance introuvable</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const handleSetUpdate = (exerciseId: string, setId: string, set: WorkoutSet) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setId]: set,
      },
    }));
  };

  const handleSetComplete = (exerciseId: string, setId: string, set: WorkoutSet) => {
    handleSetUpdate(exerciseId, setId, set);
    completeSet(exerciseId, setId, set);
  };

  const handleEndWorkout = () => {
    endWorkout();
    navigate('/');
  };

  const goToNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const goToPrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCompleteModal(true)}
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">{session.name}</h1>
                <p className="text-sm text-muted-foreground">{program.name}</p>
              </div>
            </div>
            
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{completedSets}/{totalSets}</p>
                <p className="text-xs text-muted-foreground">séries</p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                    initial={false}
                    animate={{
                      strokeDashoffset: `${2 * Math.PI * 40 * (1 - progress / 100)}`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Timer */}
      <div className="container py-6">
        <Timer className="mx-auto" />
      </div>

      {/* Exercise Navigation */}
      <div className="container pb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goToPrevExercise}
            disabled={currentExerciseIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Exercice {currentExerciseIndex + 1} / {exercises.length}
          </span>
          <Button
            variant="ghost"
            onClick={goToNextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Current Exercise */}
      <main className="container flex-1 pb-6">
        {currentExercise && (
          <ExerciseCard
            key={currentExercise.id}
            exercise={currentExercise}
            index={0}
            isExpanded={true}
            isTraining={true}
            getLastPerformance={(setId) => {
              const perf = getLastPerformance(program.id, session.id, currentExercise.id, setId);
              return perf ? { reps: perf.reps, weight: perf.weight } : undefined;
            }}
            onSetUpdate={(setId, set) => handleSetUpdate(currentExercise.id, setId, set)}
            onSetComplete={(setId, set) => handleSetComplete(currentExercise.id, setId, set)}
          />
        )}

        {/* All exercises overview */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Tous les exercices</h3>
          {exercises.map((exercise, index) => (
            <button
              key={exercise.id}
              onClick={() => setCurrentExerciseIndex(index)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                index === currentExerciseIndex
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-secondary/30 hover:bg-secondary/50'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                exercise.sets.every(s => s.isCompleted)
                  ? 'bg-success text-success-foreground'
                  : index === currentExerciseIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
              }`}>
                {exercise.sets.every(s => s.isCompleted) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={`flex-1 text-left ${
                index === currentExerciseIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {exercise.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {exercise.sets.filter(s => s.isCompleted).length}/{exercise.sets.length}
              </span>
            </button>
          ))}
        </div>

        {/* Complete workout button */}
        {allSetsCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              onClick={handleEndWorkout}
              className="w-full btn-primary-gradient glow-primary py-6 text-lg"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Terminer l'entraînement
            </Button>
          </motion.div>
        )}
      </main>

      {/* End workout confirmation modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">
                Quitter l'entraînement ?
              </h3>
              <p className="text-muted-foreground mb-6">
                {completedSets > 0
                  ? `Vous avez complété ${completedSets} séries sur ${totalSets}. Votre progression sera sauvegardée.`
                  : 'Aucune série n\'a été enregistrée.'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Continuer
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleEndWorkout}
                >
                  Quitter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
