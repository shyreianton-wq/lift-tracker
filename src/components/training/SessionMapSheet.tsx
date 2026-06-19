import { motion, AnimatePresence } from 'framer-motion';
import { Check, CircleDot, Circle, Layers, Plus } from 'lucide-react';
import { Exercise, SetType, WorkoutSet } from '@/types/workout';

interface ResolvedExercise extends Exercise {
  _resolvedExerciseId?: string;
  _historyId?: string;
}

interface NavStep {
  type: 'single' | 'superset';
  exercises: ResolvedExercise[];
}

interface SessionMapSheetProps {
  open: boolean;
  onClose: () => void;
  steps: NavStep[];
  currentStepIndex: number;
  exerciseSets: Record<string, Record<string, WorkoutSet>>;
  onJump: (index: number) => void;
  onRequestAddExercise: () => void;
}

function setTypeBadge(t: SetType | undefined) {
  if (t === 'myo-rep') return { label: 'MYO', cls: 'bg-orange-500/20 text-orange-300' };
  if (t === 'hypertrophie') return { label: 'HYP', cls: 'bg-blue-500/20 text-blue-300' };
  return { label: 'FORCE', cls: 'bg-emerald-500/20 text-emerald-300' };
}

function exerciseProgress(ex: ResolvedExercise, exerciseSets: Record<string, Record<string, WorkoutSet>>) {
  const total = ex.sets.length;
  const done = ex.sets.filter(s => s.isCompleted || exerciseSets[ex.id]?.[s.id]?.isCompleted).length;
  return { done, total };
}

// Bottom sheet listant tous les exos de la séance — tap pour sauter directement.
// Utile quand on prend les exos dans le désordre (machine occupée, etc.).
export function SessionMapSheet({
  open, onClose, steps, currentStepIndex, exerciseSets, onJump, onRequestAddExercise,
}: SessionMapSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-[81] bg-card border-t border-border rounded-t-3xl max-h-[80vh] flex flex-col"
          >
            <div className="mx-auto mt-2 mb-1 h-1 w-12 rounded-full bg-muted-foreground/30" />
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Plan de la séance</h3>
              <p className="text-xs text-muted-foreground">Tape un exo pour t y rendre directement</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {steps.map((step, idx) => {
                const isCurrent = idx === currentStepIndex;
                // Pour superset on aggrège les 2 exos
                const allEx = step.exercises;
                const aggregate = allEx.reduce((acc, ex) => {
                  const p = exerciseProgress(ex, exerciseSets);
                  return { done: acc.done + p.done, total: acc.total + p.total };
                }, { done: 0, total: 0 });
                const isDone = aggregate.done === aggregate.total && aggregate.total > 0;
                const isStarted = aggregate.done > 0 && !isDone;

                const Icon = isDone ? Check : isStarted ? CircleDot : Circle;
                const iconClass = isDone ? 'text-emerald-400' : isStarted ? 'text-primary' : 'text-muted-foreground/50';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { onJump(idx); onClose(); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 text-left transition-colors ${
                      isCurrent ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-secondary/40'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {step.type === 'superset' && (
                          <Layers className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        )}
                        <div className="text-sm font-semibold text-foreground truncate">
                          {allEx.map(e => e.name).join(' + ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {allEx.map((ex, i) => {
                          const b = setTypeBadge(ex.sets[0]?.type);
                          const p = exerciseProgress(ex, exerciseSets);
                          return (
                            <span key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${b.cls}`}>{b.label}</span>
                              <span className="tabular-nums">{p.done}/{p.total}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold tracking-wide text-primary">En cours</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-border space-y-2">
              <button
                type="button"
                onClick={() => { onRequestAddExercise(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Ajouter un exercice</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
