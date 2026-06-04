import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Timer as TimerIcon, ListChecks } from 'lucide-react';

interface SessionHeaderProps {
  sessionName: string;
  completedSetsCount: number;
  totalSets: number;
  progress: number;
  timerDuration: number;
  onOpenRest: () => void;
  onOpenMap: () => void;
  onRequestQuit: () => void;
}

export function SessionHeader({
  sessionName,
  completedSetsCount,
  totalSets,
  progress,
  timerDuration,
  onOpenRest,
  onOpenMap,
  onRequestQuit,
}: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-1 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRequestQuit}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground truncate">{sessionName} • {completedSetsCount}/{totalSets}</span>
      </div>

      {/* Bouton plan de séance — ouvre le bottom sheet de navigation */}
      <button
        onClick={onOpenMap}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-foreground hover:bg-secondary/80 active:scale-95 transition-all shrink-0"
        aria-label="Voir le plan de la séance"
      >
        <ListChecks className="h-4 w-4" />
      </button>

      {/* Bouton chrono prominent — ouvre l overlay plein écran */}
      <button
        onClick={onOpenRest}
        className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm shrink-0"
        aria-label="Démarrer le chrono de repos"
      >
        <TimerIcon className="h-4 w-4" />
        <span className="text-sm font-bold tabular-nums">{timerDuration}s</span>
      </button>

      <div className="w-8 h-8 relative shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            initial={false}
            animate={{ strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}` }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
