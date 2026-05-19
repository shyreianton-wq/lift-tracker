import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from '@/components/Timer';

interface RestTimerControlProps {
  show: boolean;
  duration: number;
  timerKey: number;
  onStart: () => void;
}

export function RestTimerControl({ show, duration, timerKey, onStart }: RestTimerControlProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden bg-background border-b border-border"
        >
          <div className="container py-2 flex justify-center">
            <Timer
              key={`timer-${timerKey}-${duration}`}
              initialDuration={duration}
              compact
              onStart={onStart}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
