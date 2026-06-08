import { motion } from 'framer-motion';
import { Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomActionsProps {
  onRequestAddExercise: () => void;
  allSetsCompleted: boolean;
  onEndWorkout: () => void;
}

// Réduit à 2 actions: ajouter un exo, terminer la séance.
// La navigation entre exos passe par SessionMapSheet (bouton plan dans le header).
export function BottomActions({
  onRequestAddExercise,
  allSetsCompleted,
  onEndWorkout,
}: BottomActionsProps) {
  return (
    <div className="mt-3 space-y-2">
      <button
        onClick={onRequestAddExercise}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Ajouter un exercice</span>
      </button>

      {allSetsCompleted && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={onEndWorkout} className="w-full btn-primary-gradient glow-primary py-5 text-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />Terminer l'entraînement
          </Button>
        </motion.div>
      )}
    </div>
  );
}
