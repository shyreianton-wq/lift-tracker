import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SetInput } from '@/components/SetInput';
import { Exercise, WorkoutSet } from '@/types/workout';

interface LastPerformance {
  reps: number;
  weight: number;
  rpe?: number;
  duration?: number;
  myoRestPauseCount?: number;
  completedAt: string;
  setType?: SetType;
}

interface PersonalBest {
  weight: number;
  reps: number;
  score: number;
}

interface SetInputPanelProps {
  activeExercise: Exercise | undefined;
  activeSet: WorkoutSet | null;
  activeSetIndex: number;
  editingSetId: string | null;
  hasNextStep: boolean;
  onNextStep: () => void;
  onSetUpdate: (exerciseId: string, setId: string, set: WorkoutSet) => void;
  onSetComplete: (exerciseId: string, setId: string, set: WorkoutSet, exerciseName?: string) => void;
  onCloseEdit: () => void;
  getLastPerf: (exercise: Exercise, setId: string, setIndex?: number) => LastPerformance | undefined;
  getPersonalBest: (exercise: Exercise, setType?: string) => PersonalBest | undefined;
}

export function SetInputPanel({
  activeExercise,
  activeSet,
  activeSetIndex,
  editingSetId,
  hasNextStep,
  onNextStep,
  onSetUpdate,
  onSetComplete,
  onCloseEdit,
  getLastPerf,
  getPersonalBest,
}: SetInputPanelProps) {
  if (!activeExercise) return null;

  // Editing a completed set
  if (editingSetId) {
    const editIdx = activeExercise.sets.findIndex(s => s.id === editingSetId);
    const editSet = editIdx >= 0 ? activeExercise.sets[editIdx] : null;
    if (!editSet) return null;
    return (
      <div className="bg-card rounded-xl border border-primary/30 p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-primary font-medium">✏️ Modification série {editIdx + 1}</span>
          <button onClick={onCloseEdit} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
        </div>
        <SetInput
          key={`edit-${editSet.id}-${editSet.type || "force"}`}
          set={editSet}
          index={editIdx}
          exerciseMode={activeExercise.mode}
          isActive={true}
          lastPerformance={getLastPerf(activeExercise, editSet.id, editIdx + 1)}
          personalBest={getPersonalBest(activeExercise, editSet.type)}
          onUpdate={(updatedSet) => onSetUpdate(activeExercise.id, editSet.id, updatedSet)}
          onComplete={(completedSet) => {
            onSetComplete(activeExercise.id, editSet.id, completedSet, activeExercise.name);
            onCloseEdit();
          }}
        />
      </div>
    );
  }

  // Active set - the main input area
  if (activeSet) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <SetInput
          key={`${activeSet.id}-${activeSet.type || "force"}`}
          set={activeSet}
          index={activeSetIndex}
          exerciseMode={activeExercise.mode}
          isActive={true}
          lastPerformance={getLastPerf(activeExercise, activeSet.id, activeSetIndex + 1)}
          personalBest={getPersonalBest(activeExercise, activeSet.type)}
          onUpdate={(updatedSet) => onSetUpdate(activeExercise.id, activeSet.id, updatedSet)}
          onComplete={(completedSet) => onSetComplete(activeExercise.id, activeSet.id, completedSet, activeExercise.name)}
        />
      </div>
    );
  }

  // All sets done for this exercise
  return (
    <div className="bg-card rounded-xl border border-success/30 p-6 text-center">
      <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground">Exercice terminé !</p>
      {hasNextStep && (
        <Button onClick={onNextStep} className="mt-3 btn-primary-gradient">
          Exercice suivant <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
