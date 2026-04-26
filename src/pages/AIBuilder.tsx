import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  Dumbbell,
  Minus,
  Plus,
  Sparkles,
  Target,
  Clock,
  AlertTriangle,
  Trash2,
  Zap,
  X,
} from 'lucide-react';
import { Program, Session, Exercise, WorkoutSet, SetType } from '@/types/workout';
import {
  generateProgram,
  AIBuilderInput,
  Goal,
  Level,
  Equipment,
  EXERCISES,
  ExerciseDef,
} from '@/services/aiProgramGenerator';

type Step = 1 | 2 | 3 | 4 | 5;

const GOALS: { id: Goal; label: string; icon: string; desc: string }[] = [
  { id: 'hypertrophie', label: 'Hypertrophie', icon: '💪', desc: 'Maximiser le gain de masse musculaire' },
  { id: 'force', label: 'Force', icon: '🏋️', desc: 'Augmenter vos charges max (1RM)' },
  { id: 'recomposition', label: 'Recomposition', icon: '🔥', desc: 'Perdre du gras et gagner du muscle' },
  { id: 'endurance', label: 'Endurance musculaire', icon: '⚡', desc: 'Plus de reps, plus longtemps' },
];

const LEVELS: { id: Level; label: string; color: string; desc: string }[] = [
  { id: 'beginner', label: 'Débutant', color: 'border-green-500 bg-green-500/10 text-green-400', desc: 'Moins de 6 mois de pratique régulière' },
  { id: 'intermediate', label: 'Intermédiaire', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400', desc: '6 mois à 2 ans de pratique régulière' },
  { id: 'advanced', label: 'Avancé', color: 'border-orange-500 bg-orange-500/10 text-orange-400', desc: 'Plus de 2 ans de pratique sérieuse' },
];

const EQUIPMENT_LIST: { key: keyof Equipment; label: string; icon: string }[] = [
  { key: 'barbell', label: 'Barres', icon: '🏋️' },
  { key: 'dumbbells', label: 'Haltères', icon: '💪' },
  { key: 'cables', label: 'Poulies/Câbles', icon: '🔗' },
  { key: 'machines', label: 'Machines', icon: '⚙️' },
  { key: 'pullupBar', label: 'Barre de traction', icon: '🔝' },
  { key: 'bodyweight', label: 'Poids du corps', icon: '🧘' },
];

const COMMON_INJURIES = [
  'Épaule', 'Genou', 'Dos/Lombaires', 'Coude', 'Poignet', 'Hanche',
];

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: 'bg-red-500/20 text-red-400',
  back: 'bg-blue-500/20 text-blue-400',
  shoulders: 'bg-purple-500/20 text-purple-400',
  quads: 'bg-green-500/20 text-green-400',
  hamstrings: 'bg-emerald-500/20 text-emerald-400',
  glutes: 'bg-pink-500/20 text-pink-400',
  biceps: 'bg-orange-500/20 text-orange-400',
  triceps: 'bg-yellow-500/20 text-yellow-400',
  calves: 'bg-teal-500/20 text-teal-400',
  abs: 'bg-indigo-500/20 text-indigo-400',
};

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Pecs',
  back: 'Dos',
  shoulders: 'Épaules',
  quads: 'Quads',
  hamstrings: 'Ischios',
  glutes: 'Fessiers',
  biceps: 'Biceps',
  triceps: 'Triceps',
  calves: 'Mollets',
  abs: 'Abdos',
};

function getMuscleGroup(exerciseName: string): string {
  const found = EXERCISES.find(e => e.name === exerciseName);
  return found?.muscleGroup || 'unknown';
}

function getAlternatives(exerciseName: string, equipment: Equipment, sessionExerciseNames: string[]): ExerciseDef[] {
  const current = EXERCISES.find(e => e.name === exerciseName);
  if (!current) return [];
  return EXERCISES.filter(
    e => e.muscleGroup === current.muscleGroup
      && e.name !== exerciseName
      && !sessionExerciseNames.includes(e.name)
      && e.equipment.some(eq => equipment[eq])
  );
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AIBuilder() {
  const navigate = useNavigate();
  const { addProgram } = useWorkout();

  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [timePerSession, setTimePerSession] = useState(60);
  const [equipment, setEquipment] = useState<Equipment>({
    barbell: true,
    dumbbells: true,
    cables: true,
    machines: true,
    pullupBar: true,
    bodyweight: true,
  });
  const [injuries, setInjuries] = useState<string[]>([]);
  const [generatedProgram, setGeneratedProgram] = useState<Program | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [swapOpenFor, setSwapOpenFor] = useState<string | null>(null);
  const [supersetPairingId, setSupersetPairingId] = useState<string | null>(null);

  const canNext =
    (step === 1 && goal !== null) ||
    (step === 2) ||
    (step === 3 && level !== null) ||
    step === 4 ||
    step === 5;

  function toggleEquipment(key: keyof Equipment) {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleInjury(injury: string) {
    setInjuries((prev) =>
      prev.includes(injury) ? prev.filter((i) => i !== injury) : [...prev, injury]
    );
  }

  async function handleGenerate() {
    if (!goal || !level) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const input: AIBuilderInput = { goal, level, daysPerWeek, timePerSession, equipment, injuries };
    const program = generateProgram(input);
    setGeneratedProgram(program);
    setActiveSessionIndex(0);
    setIsGenerating(false);
    setStep(5);
  }

  function goNext() {
    if (step === 3) {
      setStep(4);
      handleGenerate();
    } else if (step < 5) {
      setStep((step + 1) as Step);
    }
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
    else navigate('/');
  }

  function handleSave() {
    if (generatedProgram) {
      // Remove optional exercises that weren't promoted to required
      const cleanedProgram = {
        ...generatedProgram,
        sessions: generatedProgram.sessions.map(s => ({
          ...s,
          exercises: s.exercises.filter(e => !e.optional),
        })),
      };
      addProgram(cleanedProgram);
      navigate('/');
    }
  }

  function handleRegenerate() {
    setStep(4);
    setTimeout(() => handleGenerate(), 100);
  }

  // ─── Customization helpers ────────────────────────────────────────────

  function updateSession(sessionIndex: number, updater: (s: Session) => Session) {
    if (!generatedProgram) return;
    const newSessions = [...generatedProgram.sessions];
    newSessions[sessionIndex] = updater(newSessions[sessionIndex]);
    setGeneratedProgram({ ...generatedProgram, sessions: newSessions });
  }

  function updateExercise(sessionIndex: number, exerciseIndex: number, updater: (e: Exercise) => Exercise) {
    updateSession(sessionIndex, (s) => {
      const newExercises = [...s.exercises];
      newExercises[exerciseIndex] = updater(newExercises[exerciseIndex]);
      return { ...s, exercises: newExercises };
    });
  }

  function removeExercise(sessionIndex: number, exerciseIndex: number) {
    updateSession(sessionIndex, (s) => ({
      ...s,
      exercises: s.exercises.filter((_, i) => i !== exerciseIndex),
    }));
  }

  function moveExercise(sessionIndex: number, exerciseIndex: number, direction: -1 | 1) {
    const newIndex = exerciseIndex + direction;
    updateSession(sessionIndex, (s) => {
      if (newIndex < 0 || newIndex >= s.exercises.length) return s;
      const newExercises = [...s.exercises];
      [newExercises[exerciseIndex], newExercises[newIndex]] = [newExercises[newIndex], newExercises[exerciseIndex]];
      return { ...s, exercises: newExercises };
    });
  }

  function changeSetsCount(sessionIndex: number, exerciseIndex: number, delta: number) {
    setGeneratedProgram(prev => {
      if (!prev) return prev;
      // Apply the set change
      let updated = {
        ...prev,
        sessions: prev.sessions.map((s, si) =>
          si !== sessionIndex ? s : {
            ...s,
            exercises: s.exercises.map((ex, ei) => {
              if (ei !== exerciseIndex) return ex;
              const currentCount = ex.sets.length;
              const newCount = Math.max(1, Math.min(8, currentCount + delta));
              if (newCount === currentCount) return ex;
              let newSets: WorkoutSet[];
              if (newCount > currentCount) {
                const template = ex.sets[ex.sets.length - 1];
                const additions = Array.from({ length: newCount - currentCount }, () => ({
                  ...template,
                  id: generateId(),
                  isCompleted: false,
                }));
                newSets = [...ex.sets, ...additions];
              } else {
                newSets = ex.sets.slice(0, newCount);
              }
              return { ...ex, sets: newSets };
            }),
          }
        ),
      };
      // Check if the modified exercise is chest or back — rebalance if so
      const modifiedEx = updated.sessions[sessionIndex]?.exercises[exerciseIndex];
      const def = modifiedEx ? EXERCISES.find(d => d.name === modifiedEx.name) : null;
      if (def && (def.muscleGroup === 'chest' || def.muscleGroup === 'back')) {
        updated = rebalanceBackChest(updated);
      }
      return updated;
    });
  }

  // Auto-rebalance back/chest ratio after any set change
  function rebalanceBackChest(program: Program): Program {
    const TARGET_RATIO = 1.5;
    const nonOptionalExercises = (s: Session) => s.exercises.filter(e => !e.optional);

    const countSets = (muscleGroup: string) =>
      program.sessions.reduce((total, s) =>
        total + nonOptionalExercises(s)
          .filter(e => EXERCISES.find(d => d.name === e.name)?.muscleGroup === muscleGroup)
          .reduce((sum, e) => sum + e.sets.length, 0)
      , 0);

    let chestSets = countSets('chest');
    let backSets = countSets('back');
    if (chestSets === 0) return program;

    const ratio = backSets / chestSets;
    if (ratio >= 1.4 && ratio <= 1.6) return program; // close enough

    // Clone program for mutations
    const updated = {
      ...program,
      sessions: program.sessions.map(s => ({
        ...s,
        exercises: s.exercises.map(e => ({ ...e, sets: [...e.sets] })),
      })),
    };

    if (ratio < 1.4) {
      // Need more back or less chest
      // Try adding back sets first (on exercises with fewest sets, max 5)
      const backExs: { si: number; ei: number }[] = [];
      updated.sessions.forEach((s, si) => s.exercises.forEach((e, ei) => {
        if (!e.optional && EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'back' && e.sets.length < 5) {
          backExs.push({ si, ei });
        }
      }));
      backExs.sort((a, b) => updated.sessions[a.si].exercises[a.ei].sets.length - updated.sessions[b.si].exercises[b.ei].sets.length);

      let attempts = 0;
      while (countSets('back') / countSets('chest') < 1.4 && attempts < 4) {
        if (backExs.length > 0) {
          const { si, ei } = backExs[0];
          const ex = updated.sessions[si].exercises[ei];
          if (ex.sets.length < 5) {
            const template = ex.sets[ex.sets.length - 1];
            ex.sets.push({ ...template, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, isCompleted: false });
          }
          backExs.sort((a, b) => updated.sessions[a.si].exercises[a.ei].sets.length - updated.sessions[b.si].exercises[b.ei].sets.length);
        }
        attempts++;
      }

      // If still not enough, trim chest
      if (countSets('back') / countSets('chest') < 1.4) {
        const chestExs: { si: number; ei: number }[] = [];
        updated.sessions.forEach((s, si) => s.exercises.forEach((e, ei) => {
          if (!e.optional && EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'chest' && e.sets.length > 2) {
            chestExs.push({ si, ei });
          }
        }));
        chestExs.sort((a, b) => updated.sessions[b.si].exercises[b.ei].sets.length - updated.sessions[a.si].exercises[a.ei].sets.length);

        let trimAttempts = 0;
        while (countSets('back') / countSets('chest') < 1.4 && chestExs.length > 0 && trimAttempts < 4) {
          const { si, ei } = chestExs[0];
          const ex = updated.sessions[si].exercises[ei];
          if (ex.sets.length > 2) {
            ex.sets.pop();
          }
          chestExs.sort((a, b) => updated.sessions[b.si].exercises[b.ei].sets.length - updated.sessions[a.si].exercises[a.ei].sets.length);
          chestExs.filter(c => updated.sessions[c.si].exercises[c.ei].sets.length > 2);
          trimAttempts++;
        }
      }
    } else if (ratio > 1.6) {
      // Too much back relative to chest — add chest sets or trim back
      const chestExs: { si: number; ei: number }[] = [];
      updated.sessions.forEach((s, si) => s.exercises.forEach((e, ei) => {
        if (!e.optional && EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'chest' && e.sets.length < 5) {
          chestExs.push({ si, ei });
        }
      }));
      chestExs.sort((a, b) => updated.sessions[a.si].exercises[a.ei].sets.length - updated.sessions[b.si].exercises[b.ei].sets.length);

      let attempts = 0;
      while (countSets('back') / countSets('chest') > 1.6 && attempts < 4) {
        if (chestExs.length > 0) {
          const { si, ei } = chestExs[0];
          const ex = updated.sessions[si].exercises[ei];
          if (ex.sets.length < 5) {
            const template = ex.sets[ex.sets.length - 1];
            ex.sets.push({ ...template, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, isCompleted: false });
          }
          chestExs.sort((a, b) => updated.sessions[a.si].exercises[a.ei].sets.length - updated.sessions[b.si].exercises[b.ei].sets.length);
        }
        attempts++;
      }
    }

    return updated;
  }

  function changeReps(sessionIndex: number, exerciseIndex: number, newReps: number) {
    updateExercise(sessionIndex, exerciseIndex, (ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, targetReps: newReps })),
    }));
  }

  function toggleSetType(sessionIndex: number, exerciseIndex: number) {
    updateExercise(sessionIndex, exerciseIndex, (ex) => {
      const currentType = ex.sets[0]?.type || 'force';
      const newType: SetType = currentType === 'force' ? 'hypertrophie' : currentType === 'hypertrophie' ? 'myo-rep' : 'force';
      return {
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, type: newType })),
      };
    });
  }

  function swapExercise(sessionIndex: number, exerciseIndex: number, newExDef: ExerciseDef) {
    updateExercise(sessionIndex, exerciseIndex, (ex) => ({
      ...ex,
      name: newExDef.name,
      mode: newExDef.mode,
    }));
    setSwapOpenFor(null);
  }


  function handleAISupersetToggle(sessionIndex: number, exerciseId: string) {
    if (!generatedProgram) return;
    const session = generatedProgram.sessions[sessionIndex];
    if (!session) return;
    const exercise = session.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    if (exercise.supersetPairId) {
      const pairId = exercise.supersetPairId;
      updateSession(sessionIndex, (s) => ({
        ...s,
        exercises: s.exercises.map(e => e.supersetPairId === pairId ? { ...e, supersetPairId: undefined } : e),
      }));
      setSupersetPairingId(null);
      return;
    }
    
    if (supersetPairingId && supersetPairingId !== exerciseId) {
      const newPairId = "ss-" + Date.now();
      updateSession(sessionIndex, (s) => {
        let newExercises = [...s.exercises];
        const firstIdx = newExercises.findIndex(e => e.id === supersetPairingId);
        const secondIdx = newExercises.findIndex(e => e.id === exerciseId);
        if (firstIdx < 0 || secondIdx < 0) return s;
        const [moved] = newExercises.splice(secondIdx, 1);
        const newFirstIdx = newExercises.findIndex(e => e.id === supersetPairingId);
        newExercises.splice(newFirstIdx + 1, 0, moved);
        newExercises = newExercises.map(e =>
          e.id === supersetPairingId || e.id === exerciseId
            ? { ...e, supersetPairId: newPairId }
            : e
        );
        return { ...s, exercises: newExercises };
      });
      setSupersetPairingId(null);
      return;
    }
    
    setSupersetPairingId(supersetPairingId === exerciseId ? null : exerciseId);
  }

  const stepTitles: Record<Step, string> = {
    1: 'Objectif',
    2: 'Contraintes',
    3: 'Niveau',
    4: 'Génération',
    5: 'Personnalisation',
  };

  const activeSession = generatedProgram?.sessions[activeSessionIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nouveau programme
            </h1>
            <p className="text-xs text-muted-foreground">
              Étape {step}/5 — {stepTitles[step]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-primary' : s < step ? 'w-2 bg-primary/60' : 'w-2 bg-border'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              title="Quitter"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* Step 1: Goal */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <h2 className="text-2xl font-bold text-foreground mb-1">Quel est votre objectif ?</h2>
              <p className="text-muted-foreground mb-6">Cela détermine les rep ranges et le volume.</p>
              <div className="flex flex-col gap-4">
                {GOALS.map((g) => (
                  <motion.button
                    key={g.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGoal(g.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                      goal === g.id
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{g.label}</h3>
                        <p className="text-sm text-muted-foreground">{g.desc}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Constraints */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <h2 className="text-2xl font-bold text-foreground mb-1">Vos contraintes</h2>
              <p className="text-muted-foreground mb-6">Adaptez selon votre emploi du temps et équipement.</p>

              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Jours par semaine
                </label>
                <div className="flex gap-2 mt-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDaysPerWeek(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                        daysPerWeek === d
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d}j
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Durée par séance : {timePerSession} min
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setTimePerSession(Math.max(30, timePerSession - 15))}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 h-2 bg-secondary rounded-full relative">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((timePerSession - 30) / 60) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setTimePerSession(Math.min(90, timePerSession + 15))}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>30 min</span>
                  <span>90 min</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Équipement disponible
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {EQUIPMENT_LIST.map((eq) => (
                    <button
                      key={eq.key}
                      onClick={() => toggleEquipment(eq.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                        equipment[eq.key]
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      <span className="mr-2">{eq.icon}</span>
                      {eq.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Blessures / Limitations
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_INJURIES.map((inj) => (
                    <button
                      key={inj}
                      onClick={() => toggleInjury(inj)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        injuries.includes(inj)
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                          : 'border-border bg-secondary text-muted-foreground'
                      }`}
                    >
                      {inj}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Level */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <h2 className="text-2xl font-bold text-foreground mb-1">Votre niveau</h2>
              <p className="text-muted-foreground mb-6">Cela ajuste le volume et les techniques.</p>
              <div className="flex flex-col gap-4">
                {LEVELS.map((l) => (
                  <motion.button
                    key={l.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLevel(l.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                      level === l.id
                        ? l.color + ' border-opacity-100 shadow-lg'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <h3 className="text-lg font-bold text-foreground mb-1">{l.label}</h3>
                    <p className="text-sm text-muted-foreground">{l.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Generating */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent mb-6"
              />
              <h2 className="text-xl font-bold text-foreground mb-2">Génération en cours...</h2>
              <p className="text-muted-foreground text-sm">Analyse de vos paramètres et construction du programme</p>
            </motion.div>
          )}

          {/* Step 5: Customize */}
          {step === 5 && generatedProgram && activeSession && (
            <motion.div key="s5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Personnalisez votre programme
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                L'algorithme a généré ce programme. Personnalisez-le avant de sauvegarder.
              </p>

              {/* Back/Chest ratio indicator */}
              {(() => {
                const allExercises = generatedProgram.sessions.flatMap(s => s.exercises.filter(e => !e.optional));
                const chestSets = allExercises.filter(e => EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'chest').reduce((s, e) => s + e.sets.length, 0);
                const backSets = allExercises.filter(e => EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'back').reduce((s, e) => s + e.sets.length, 0);
                const ratio = chestSets > 0 ? (backSets / chestSets) : 0;
                const isBalanced = ratio >= 1.4 && ratio <= 1.7;
                const ratioText = ratio.toFixed(1);

                return (
                  <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs font-medium ${
                    isBalanced ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    <span>Ratio Dos/Pecs : {ratioText}× ({backSets} vs {chestSets} séries)</span>
                    {isBalanced ? (
                      <span>✅</span>
                    ) : (
                      <span>⚠️ Cible : 1.5×</span>
                    )}
                  </div>
                );
              })()}

              {/* Session Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                {generatedProgram.sessions.map((session, idx) => (
                  <button
                    key={session.id}
                    onClick={() => { setActiveSessionIndex(idx); setSwapOpenFor(null); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      idx === activeSessionIndex
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {session.name}
                  </button>
                ))}
              </div>

              {/* Superset pairing banner */}
              {supersetPairingId && (
                <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-300">Cliquez sur un autre exercice pour créer un superset</span>
                  <button onClick={() => setSupersetPairingId(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                </div>
              )}
              {/* Exercises List — required */}
              <div className="flex flex-col gap-3">
                {activeSession.exercises.filter(e => !e.optional).map((ex, exIdx) => {
                  const muscleGroup = getMuscleGroup(ex.name);
                  const colorClass = MUSCLE_GROUP_COLORS[muscleGroup] || 'bg-gray-500/20 text-gray-400';
                  const label = MUSCLE_GROUP_LABELS[muscleGroup] || muscleGroup;
                  const setType = ex.sets[0]?.type || 'force';
                  const targetReps = ex.sets[0]?.targetReps || 10;
                  const sessionExNames = activeSession.exercises.map(e => e.name);
                  const alternatives = getAlternatives(ex.name, equipment, sessionExNames);
                  const isSwapOpen = swapOpenFor === ex.id;

                  return (
                    <div key={ex.id} className={`rounded-2xl p-4 bg-card border ${ex.supersetPairId ? "border-purple-500/30 border-l-4 border-l-purple-500" : "border-border"}`}>
                      {/* Top row: name + badges + remove */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setSwapOpenFor(isSwapOpen ? null : ex.id)}
                          className="text-left font-semibold text-foreground truncate hover:text-primary transition-colors flex items-center gap-1 flex-1 min-w-0"
                        >
                          {ex.supersetPairId && <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 mr-1">⚡SS</span>}<span className="truncate">{ex.name}</span>
                          {alternatives.length > 0 && (
                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isSwapOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
                            {label}
                          </span>
                          <button
                            onClick={() => toggleSetType(activeSessionIndex, exIdx)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                              setType === 'myo-rep'
                                ? 'bg-orange-500/20 text-orange-400'
                                : setType === 'hypertrophie'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {setType === 'myo-rep' ? 'Myo' : setType === 'hypertrophie' ? 'Hyp' : 'Force'}
                          </button>
                        </div>
                        <button
                          onClick={() => removeExercise(activeSessionIndex, exIdx)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Swap dropdown */}
                      {isSwapOpen && alternatives.length > 0 && (
                        <div className="mb-3 bg-secondary/50 rounded-xl p-2 max-h-40 overflow-y-auto">
                          {alternatives.map((alt) => (
                            <button
                              key={alt.name}
                              onClick={() => swapExercise(activeSessionIndex, exIdx, alt)}
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-primary/10 transition-colors"
                            >
                              {alt.name}
                              <span className="text-[10px] text-muted-foreground ml-2">
                                {alt.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Controls row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Sets ± */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Sets</span>
                          <button
                            onClick={() => changeSetsCount(activeSessionIndex, exIdx, -1)}
                            className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold text-foreground w-5 text-center">{ex.sets.length}</span>
                          <button
                            onClick={() => changeSetsCount(activeSessionIndex, exIdx, 1)}
                            className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Reps input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Reps</span>
                          <input
                            type="number"
                            value={targetReps}
                            onChange={(e) => changeReps(activeSessionIndex, exIdx, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-14 h-7 rounded-lg bg-secondary text-center text-sm font-bold text-foreground border-0 focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        {/* Superset */}                        <button                          onClick={() => handleAISupersetToggle(activeSessionIndex, ex.id)}                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${                            ex.supersetPairId ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"                            : supersetPairingId === ex.id ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500"                            : supersetPairingId ? "bg-purple-500/10 text-purple-400/60 hover:bg-purple-500/20 border border-dashed border-purple-500/40"                            : "bg-secondary text-muted-foreground hover:bg-purple-500/10 hover:text-purple-400"                          }`}                          title={ex.supersetPairId ? "Retirer du superset" : "Créer un superset"}                        >                          <Zap className="h-3 w-3" />SS                        </button>



                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Reorder */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveExercise(activeSessionIndex, exIdx, -1)}
                            disabled={exIdx === 0}
                            className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveExercise(activeSessionIndex, exIdx, 1)}
                            disabled={exIdx === activeSession.exercises.length - 1}
                            className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional exercises — click to add */}
              {activeSession.exercises.some(e => e.optional) && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-medium">⏱️ Optionnel — si tu as le temps</p>
                  <div className="flex flex-col gap-2">
                    {activeSession.exercises.filter(e => e.optional).map((ex, _) => {
                      const muscleGroup = getMuscleGroup(ex.name);
                      const colorClass = MUSCLE_GROUP_COLORS[muscleGroup] || 'bg-gray-500/20 text-gray-400';
                      const label = MUSCLE_GROUP_LABELS[muscleGroup] || muscleGroup;
                      const realIdx = activeSession.exercises.findIndex(e2 => e2.id === ex.id);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => {
                            // Promote to required
                            setGeneratedProgram(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                sessions: prev.sessions.map((s, si) =>
                                  si !== activeSessionIndex ? s : {
                                    ...s,
                                    exercises: s.exercises.map(e =>
                                      e.id === ex.id ? { ...e, optional: undefined } : e
                                    ),
                                  }
                                ),
                              };
                            });
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/60 bg-card/30 hover:bg-card/60 hover:border-primary/40 transition-all"
                        >
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{ex.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
                            {label}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{ex.sets.length}×{ex.sets[0]?.targetReps}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  onClick={handleSave}
                  className="w-full h-12 btn-primary-gradient glow-primary font-bold text-base"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Sauvegarder le programme
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regénérer
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="w-full h-10 text-muted-foreground hover:text-destructive"
                >
                  Abandonner
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer nav (steps 1-3) */}
      {step <= 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border">
          <div className="container py-4 flex gap-3">
            <Button variant="outline" onClick={goBack} className="flex-1 h-12">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button
              onClick={goNext}
              disabled={!canNext}
              className="flex-1 h-12 btn-primary-gradient glow-primary font-semibold"
            >
              {step === 3 ? 'Générer' : 'Suivant'}
              {step === 3 ? <Sparkles className="h-4 w-4 ml-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      )}

      {step <= 3 && <div className="h-24" />}
    </div>
  );
}
