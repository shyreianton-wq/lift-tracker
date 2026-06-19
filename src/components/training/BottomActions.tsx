import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomActionsProps {
  allSetsCompleted: boolean;
  onEndWorkout: () => void;
}

// Plus que le bouton Terminer (apparait quand toutes les séries sont validées).
// L ajout d exercice est désormais dans SessionMapSheet (bouton plan du header).
export function BottomActions({ allSetsCompleted, onEndWorkout }: BottomActionsProps) {
  if (!allSetsCompleted) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
      <Button onClick={onEndWorkout} className="w-full btn-primary-gradient glow-primary py-5 text-lg">
        <CheckCircle2 className="h-5 w-5 mr-2" />Terminer l'entraînement
      </Button>
    </motion.div>
  );
}
