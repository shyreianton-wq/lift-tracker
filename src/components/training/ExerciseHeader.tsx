import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Exercise, ExerciseMode } from '@/types/workout';

interface ExerciseHeaderProps {
  currentStepIndex: number;
  totalSteps: number;
  isSuperset: boolean;
  supersetActiveIdx: number;
  activeExercise: Exercise | undefined;
  exProgression: number | null;
  onPrev: () => void;
  onNext: () => void;
  onClickName: () => void;
  onToggleMode: () => void;
  onToggleType: () => void;
}

// Une seule ligne: nav + mode + type + nom + progression.
// Le nom occupe l espace flex restant et truncate si trop long.
export function ExerciseHeader({
  currentStepIndex,
  totalSteps,
  isSuperset,
  supersetActiveIdx,
  activeExercise,
  exProgression,
  onPrev,
  onNext,
  onClickName,
  onToggleMode,
  onToggleType,
}: ExerciseHeaderProps) {
  const type = activeExercise?.sets[0]?.type;
  const typeStyle =
    type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400'
    : type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400'
    : 'bg-green-500/20 text-green-400';
  const typeLabel = type === 'myo-rep' ? 'Myo' : type === 'hypertrophie' ? 'Hyp' : 'Force';

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <button
        onClick={onPrev}
        disabled={currentStepIndex === 0}
        className={`p-1 shrink-0 ${currentStepIndex === 0 ? 'opacity-30' : 'opacity-100'}`}
        aria-label="Exercice précédent"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {isSuperset && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold shrink-0">
          {supersetActiveIdx === 0 ? 'A' : 'B'}
        </span>
      )}

      {activeExercise && (
        <>
          <button
            onClick={onToggleMode}
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
              activeExercise.mode === 'time' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'
            }`}
            aria-label="Changer le mode"
          >
            {activeExercise.mode === 'time' ? '⏱' : '🔢'}
          </button>

          {activeExercise.mode !== 'time' && (
            <button
              onClick={onToggleType}
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${typeStyle}`}
              aria-label="Changer le type d effort"
            >
              {typeLabel}
            </button>
          )}
        </>
      )}

      <h2
        className="flex-1 min-w-0 text-sm font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
        onClick={(e) => { e.stopPropagation(); onClickName(); }}
        title={activeExercise?.name}
      >
        {activeExercise?.name}
      </h2>

      {exProgression !== null && (
        <span
          className={`text-xs font-bold tabular-nums shrink-0 ${
            exProgression > 0 ? 'text-green-400' : exProgression < 0 ? 'text-red-400' : 'text-muted-foreground'
          }`}
          title="Progression vs séance précédente"
        >
          {exProgression > 0 ? '+' : ''}{exProgression}%
        </span>
      )}

      <button
        onClick={onNext}
        disabled={currentStepIndex === totalSteps - 1}
        className={`p-1 shrink-0 ${currentStepIndex === totalSteps - 1 ? 'opacity-30' : 'opacity-100'}`}
        aria-label="Exercice suivant"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export type { ExerciseMode };
