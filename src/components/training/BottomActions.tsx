import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavStep {
  type: 'single' | 'superset';
  exercises: Array<{ id: string; name: string; sets: Array<unknown> }>;
}

interface BottomActionsProps {
  remainingSteps: NavStep[];
  currentStepIndex: number;
  showExerciseList: boolean;
  onToggleExerciseList: () => void;
  onJumpToStep: (stepIdx: number, supersetIdx: number) => void;
  onRequestAddExercise: () => void;
  allSetsCompleted: boolean;
  onEndWorkout: () => void;
}

export function BottomActions({
  remainingSteps,
  currentStepIndex,
  showExerciseList,
  onToggleExerciseList,
  onJumpToStep,
  onRequestAddExercise,
  allSetsCompleted,
  onEndWorkout,
}: BottomActionsProps) {
  return (
    <>
      {/* Remaining exercises - collapsible */}
      {remainingSteps.length > 0 && (
        <div className="mt-4">
          <button
            onClick={onToggleExerciseList}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Exercices suivants ({remainingSteps.reduce((n, s) => n + s.exercises.length, 0)})</span>
            {showExerciseList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showExerciseList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 mt-1">
                  {remainingSteps.map((step, i) => {
                    const stepIdx = currentStepIndex + 1 + i;
                    return step.exercises.map((ex, exIdx) => (
                      <button
                        key={ex.id}
                        onClick={() => onJumpToStep(stepIdx, exIdx)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all"
                      >
                        {step.type === 'superset' && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                            {exIdx === 0 ? 'A' : 'B'}
                          </span>
                        )}
                        <span className="flex-1 text-left text-sm text-muted-foreground">{ex.name}</span>
                        <span className="text-xs text-muted-foreground">{ex.sets.length}s</span>
                      </button>
                    ));
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add exercise button */}
      <div className="mt-4">
        <button
          onClick={onRequestAddExercise}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Ajouter un exercice</span>
        </button>
      </div>

      {allSetsCompleted && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Button onClick={onEndWorkout} className="w-full btn-primary-gradient glow-primary py-6 text-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />Terminer l'entraînement
          </Button>
        </motion.div>
      )}
    </>
  );
}
