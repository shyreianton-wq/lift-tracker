import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SessionHeaderProps {
  sessionName: string;
  completedSetsCount: number;
  totalSets: number;
  progress: number;
  timerDuration: number;
  showTimer: boolean;
  onToggleTimer: () => void;
  onRequestQuit: () => void;
}

export function SessionHeader({
  sessionName,
  completedSetsCount,
  totalSets,
  progress,
  timerDuration,
  showTimer,
  onToggleTimer,
  onRequestQuit,
}: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRequestQuit}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{sessionName} • {completedSetsCount}/{totalSets}</span>
      </div>
      <button
        onClick={onToggleTimer}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        aria-pressed={showTimer}
      >
        <span className="text-xs">⏱</span>
        <span className="text-xs font-medium text-primary">{timerDuration}s</span>
      </button>
      <div className="w-8 h-8 relative">
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
