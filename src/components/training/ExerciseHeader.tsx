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
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={currentStepIndex === 0}
        className={`p-1 ${currentStepIndex === 0 ? 'opacity-30' : 'opacity-100'}`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 text-center min-w-0">
        <div className="flex items-center justify-center gap-1.5">
          {isSuperset && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
              {supersetActiveIdx === 0 ? 'A' : 'B'}
            </span>
          )}
          <h2
            className="text-sm font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              onClickName();
            }}
          >{activeExercise?.name}</h2>
          {exProgression !== null && (
            <span className={`text-xs font-bold ${
              exProgression > 0 ? 'text-green-400' : exProgression < 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {exProgression > 0 ? '📈+' : exProgression < 0 ? '📉' : '➡️'}{exProgression}%
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          {activeExercise && (
            <>
              <button
                onClick={onToggleMode}
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                  activeExercise.mode === 'time' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {activeExercise.mode === 'time' ? '⏱ Temps' : '🔢 Reps'}
              </button>
              {activeExercise.mode !== 'time' && (
                <button
                  onClick={onToggleType}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    activeExercise.sets[0]?.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400'
                      : activeExercise.sets[0]?.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {activeExercise.sets[0]?.type === 'myo-rep' ? 'Myo' : activeExercise.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {activeExercise.sets.filter(s => s.isCompleted).length}/{activeExercise.sets.length}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={currentStepIndex === totalSteps - 1}
        className={`p-1 ${currentStepIndex === totalSteps - 1 ? 'opacity-30' : 'opacity-100'}`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// Re-export to keep ExerciseMode accessible if needed elsewhere
export type { ExerciseMode };
