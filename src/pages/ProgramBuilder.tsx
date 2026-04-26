import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Dumbbell,
  Minus,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  PROGRAM_TEMPLATES,
  ProgramTemplate,
  ExerciseSlot,
  SessionTemplate,
} from '@/data/programTemplates';
import { Program, Session, Exercise, WorkoutSet, SetType } from '@/types/workout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = 'beginner' | 'intermediate' | 'advanced';
type Step = 1 | 2 | 3 | 4;

interface BuilderExercise {
  slotId: string;
  slotLabel: string;
  muscleGroup: string;
  selectedVariant: string;
  sets: number;
  reps: string;
  setType: SetType;
  mode: 'reps' | 'time';
  availableVariants: { name: string; mode: 'reps' | 'time' }[];
  optional: boolean;
  enabled: boolean;
}

interface BuilderSession {
  templateId: string;
  name: string;
  exercises: BuilderExercise[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function parseReps(repsStr: string): number {
  // e.g. "8-12" → 10, "15-20" → 17, "30s" → 30
  if (repsStr.endsWith('s')) return parseInt(repsStr);
  const parts = repsStr.split('-').map(Number);
  if (parts.length === 2) return Math.round((parts[0] + parts[1]) / 2);
  return parts[0] || 10;
}

function slotToBuilderExercise(slot: ExerciseSlot, level: Level): BuilderExercise {
  return {
    slotId: slot.id,
    slotLabel: slot.slotLabel,
    muscleGroup: slot.muscleGroup,
    selectedVariant: slot.defaultExercise,
    sets: slot.sets[level],
    reps: slot.reps[level],
    setType: slot.defaultSetType[level],
    mode: slot.variants[0]?.mode ?? 'reps',
    availableVariants: slot.variants,
    optional: slot.optional ?? false,
    enabled: true,
  };
}

function buildSessions(templates: SessionTemplate[], level: Level): BuilderSession[] {
  return templates.map((t) => ({
    templateId: t.id,
    name: t.name,
    exercises: t.exercises.map((slot) => slotToBuilderExercise(slot, level)),
  }));
}

function builderToProgram(
  name: string,
  description: string,
  sessions: BuilderSession[]
): Program {
  return {
    id: generateId(),
    name,
    description,
    createdAt: new Date().toISOString(),
    sessions: sessions.map((s) => ({
      id: generateId(),
      name: s.name,
      exercises: s.exercises
        .filter((e) => e.enabled)
        .map((e) => {
          const sets: WorkoutSet[] = Array.from({ length: e.sets }, () => ({
            id: generateId(),
            type: e.setType,
            targetReps: e.mode === 'time' ? 0 : parseReps(e.reps),
            targetWeight: 0,
            targetDuration: e.mode === 'time' ? parseReps(e.reps) : undefined,
            isCompleted: false,
          }));
          const ex: Exercise = {
            id: generateId(),
            name: e.selectedVariant,
            sets,
            mode: e.mode,
          };
          return ex;
        }),
    })) as Session[],
  };
}

// ─── Step Components ──────────────────────────────────────────────────────────

const LEVEL_INFO: Record<Level, { label: string; color: string; desc: string }> = {
  beginner: {
    label: 'Débutant',
    color: 'border-green-500 bg-green-500/10 text-green-400',
    desc: '3 séries/exo · focus composés · 8-12 reps · moins d\'isolation',
  },
  intermediate: {
    label: 'Intermédiaire',
    color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
    desc: '3-4 séries · plus d\'isolation · mix 6-8 et 10-15 reps · myo-rep possible',
  },
  advanced: {
    label: 'Avancé',
    color: 'border-orange-500 bg-orange-500/10 text-orange-400',
    desc: '4-5 séries · techniques d\'intensité · unilatéral · volume élevé',
  },
};

function SplitCard({
  template,
  selected,
  onClick,
}: {
  template: ProgramTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground">{template.name}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          {template.daysPerWeek}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{template.description}</p>
      <div className="mt-3 flex gap-2">
        {template.sessions.map((s) => (
          <span
            key={s.id}
            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
          >
            {s.name}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

function SetTypeBadge({
  type,
  onChange,
}: {
  type: SetType;
  onChange: (t: SetType) => void;
}) {
  return (
    <button
      onClick={() => onChange(type === 'force' ? 'hypertrophie' : type === 'hypertrophie' ? 'myo-rep' : 'force')}
      className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
        type === 'force'
          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
          : type === 'hypertrophie'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
      }`}
    >
      {type === 'force' ? 'Force' : type === 'hypertrophie' ? 'Hyp' : 'Myo'}
    </button>
  );
}

function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: BuilderExercise;
  onChange: (updated: BuilderExercise) => void;
  onRemove: () => void;
}) {
  const [showVariants, setShowVariants] = useState(false);

  if (!ex.enabled) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-secondary/40 rounded-xl p-3 border border-border/50"
    >
      <div className="flex items-start gap-2">
        {/* Muscle group dot */}
        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Slot label (functional role) */}
          <p className="text-xs font-semibold text-primary/80 mb-0.5 tracking-wide uppercase">{ex.slotLabel}</p>

          {/* Variant selector */}
          <div className="relative mb-2">
            <button
              onClick={() => ex.availableVariants.length > 1 && setShowVariants(!showVariants)}
              className={`w-full flex items-center justify-between gap-1 text-sm text-foreground transition-colors ${ex.availableVariants.length > 1 ? 'hover:text-primary cursor-pointer' : ''}`}
            >
              <span className="truncate">{ex.selectedVariant}</span>
              {ex.availableVariants.length > 1 && (
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                    🔄 {ex.availableVariants.length}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showVariants ? 'rotate-180' : ''}`}
                  />
                </span>
              )}
            </button>
            <AnimatePresence>
              {showVariants && ex.availableVariants.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-20 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  {ex.availableVariants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => {
                        onChange({ ...ex, selectedVariant: v.name, mode: v.mode });
                        setShowVariants(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                        ex.selectedVariant === v.name ? 'text-primary font-medium' : 'text-foreground'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sets */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChange({ ...ex, sets: Math.max(1, ex.sets - 1) })}
                className="w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {ex.sets} séries
              </span>
              <button
                onClick={() => onChange({ ...ex, sets: Math.min(8, ex.sets + 1) })}
                className="w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Reps */}
            <input
              type="text"
              value={ex.reps}
              onChange={(e) => onChange({ ...ex, reps: e.target.value })}
              className="text-xs w-14 bg-secondary border border-border rounded-lg px-2 py-1 text-center text-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">
              {ex.mode === 'time' ? '' : 'reps'}
            </span>

            {/* Set type badge */}
            <SetTypeBadge
              type={ex.setType}
              onChange={(t) => onChange({ ...ex, setType: t })}
            />
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProgramBuilder() {
  const navigate = useNavigate();
  const { addProgram } = useWorkout();

  const [step, setStep] = useState<Step>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [sessions, setSessions] = useState<BuilderSession[]>([]);
  const [programName, setProgramName] = useState('');
  const [activeSession, setActiveSession] = useState(0);

  // Step navigation
  const canNext =
    (step === 1 && selectedTemplate !== null) ||
    (step === 2 && selectedLevel !== null) ||
    (step === 3) ||
    step === 4;

  function goNext() {
    if (step === 1 && selectedTemplate) {
      setStep(2);
    } else if (step === 2 && selectedLevel) {
      const built = buildSessions(selectedTemplate!.sessions, selectedLevel);
      setSessions(built);
      setProgramName(`${selectedTemplate!.name} — ${LEVEL_INFO[selectedLevel].label}`);
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
    else navigate('/');
  }

  function updateExercise(
    sessionIdx: number,
    exIdx: number,
    updated: BuilderExercise
  ) {
    setSessions((prev) =>
      prev.map((s, si) =>
        si !== sessionIdx
          ? s
          : {
              ...s,
              exercises: s.exercises.map((e, ei) => (ei !== exIdx ? e : updated)),
            }
      )
    );
  }

  function removeExercise(sessionIdx: number, exIdx: number) {
    setSessions((prev) =>
      prev.map((s, si) =>
        si !== sessionIdx
          ? s
          : {
              ...s,
              exercises: s.exercises.map((e, ei) =>
                ei !== exIdx ? e : { ...e, enabled: false }
              ),
            }
      )
    );
  }

  function addExerciseBack(sessionIdx: number, exIdx: number) {
    setSessions((prev) =>
      prev.map((s, si) =>
        si !== sessionIdx
          ? s
          : {
              ...s,
              exercises: s.exercises.map((e, ei) =>
                ei !== exIdx ? e : { ...e, enabled: true }
              ),
            }
      )
    );
  }

  function handleCreate() {
    const program = builderToProgram(programName, selectedTemplate?.description ?? '', sessions);
    addProgram(program);
    navigate('/');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const stepTitles: Record<Step, string> = {
    1: 'Choix du Split',
    2: 'Niveau',
    3: 'Personnalisation',
    4: 'Récapitulatif',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <button
            onClick={goBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground">Program Builder</h1>
            <p className="text-xs text-muted-foreground">
              Étape {step}/4 — {stepTitles[step]}
            </p>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-primary'
                    : s < step
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Split ───────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Choisissez votre split
              </h2>
              <p className="text-muted-foreground mb-6">
                Le split définit l'organisation de vos séances.
              </p>
              <div className="flex flex-col gap-4">
                {PROGRAM_TEMPLATES.map((t) => (
                  <SplitCard
                    key={t.id}
                    template={t}
                    selected={selectedTemplate?.id === t.id}
                    onClick={() => setSelectedTemplate(t)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Level ───────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Votre niveau
              </h2>
              <p className="text-muted-foreground mb-6">
                Cela ajustera les séries, les reps et les techniques utilisées.
              </p>
              <div className="flex flex-col gap-4">
                {(Object.keys(LEVEL_INFO) as Level[]).map((level) => {
                  const info = LEVEL_INFO[level];
                  const isSelected = selectedLevel === level;
                  return (
                    <motion.button
                      key={level}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedLevel(level)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? info.color + ' border-opacity-100 shadow-lg'
                          : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        {info.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">{info.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Customization ────────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Personnalisez vos séances
              </h2>
              <p className="text-muted-foreground mb-2">
                Ajustez les exercices, variantes, séries et reps.
              </p>
              <p className="text-xs text-primary/80 bg-primary/10 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                <span>🔄</span>
                <span>Cliquez sur un exercice pour le remplacer par une variante équivalente</span>
              </p>

              {/* Session tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {sessions.map((s, i) => (
                  <button
                    key={s.templateId}
                    onClick={() => setActiveSession(i)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all ${
                      activeSession === i
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {/* Active session exercises */}
              {sessions[activeSession] && (
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {sessions[activeSession].exercises.map((ex, ei) =>
                      ex.enabled ? (
                        <ExerciseRow
                          key={ex.slotId}
                          ex={ex}
                          onChange={(updated) => updateExercise(activeSession, ei, updated)}
                          onRemove={() => removeExercise(activeSession, ei)}
                        />
                      ) : null
                    )}
                  </AnimatePresence>

                  {/* Disabled exercises (add back) */}
                  {sessions[activeSession].exercises.some((e) => !e.enabled) && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Exercices désactivés :</p>
                      <div className="flex flex-wrap gap-2">
                        {sessions[activeSession].exercises.map((ex, ei) =>
                          !ex.enabled ? (
                            <button
                              key={ex.slotId}
                              onClick={() => addExerciseBack(activeSession, ei)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 transition-all"
                            >
                              <Plus className="h-3 w-3" />
                              {ex.selectedVariant}
                            </button>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Recap ────────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Récapitulatif
              </h2>
              <p className="text-muted-foreground mb-6">
                Vérifiez votre programme avant de le créer.
              </p>

              {/* Program name */}
              <div className="mb-6">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Nom du programme
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Sessions recap */}
              <div className="flex flex-col gap-4">
                {sessions.map((s) => {
                  const enabled = s.exercises.filter((e) => e.enabled);
                  return (
                    <div
                      key={s.templateId}
                      className="bg-card border border-border rounded-2xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{s.name}</h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {enabled.length} exos
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {enabled.map((ex) => (
                          <div
                            key={ex.slotId}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                            <span className="flex-1 text-foreground truncate">
                              {ex.selectedVariant}
                            </span>
                            <span className="text-muted-foreground shrink-0">
                              {ex.sets}×{ex.reps}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                                ex.setType === 'force'
                                  ? 'bg-green-500/20 text-green-400'
                                  : ex.setType === 'hypertrophie'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-orange-500/20 text-orange-400'
                              }`}
                            >
                              {ex.setType === 'force' ? 'F' : ex.setType === 'hypertrophie' ? 'H' : 'M'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Create button */}
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handleCreate}
                  disabled={!programName.trim()}
                  className="w-full h-12 btn-primary-gradient glow-primary font-bold text-base"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Créer le programme
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer nav (steps 1-3) */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border">
          <div className="container py-4 flex gap-3">
            <Button
              variant="outline"
              onClick={goBack}
              className="flex-1 h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button
              onClick={goNext}
              disabled={!canNext}
              className="flex-1 h-12 btn-primary-gradient glow-primary font-semibold"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Spacer for fixed footer */}
      {step < 4 && <div className="h-24" />}
    </div>
  );
}
