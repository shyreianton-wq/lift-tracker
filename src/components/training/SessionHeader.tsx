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

function formatChrono(secs: number) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}:${s.toString().padStart(2, '0')}` : `${m}m`;
}

// Header en 2 clusters: info à gauche, actions à droite.
// Barre de progression fine sous le header (1.5px) — donne le contexte visuel
// sans embarquer un cercle séparé qui redondait avec le compteur N/M.
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
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        {/* Cluster gauche — passif: quit + label */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -ml-2" onClick={onRequestQuit}>
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate leading-tight">
              {sessionName}
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums leading-tight">
              {completedSetsCount}/{totalSets} séries · {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Cluster droit — actions: plan + chrono */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenMap}
            aria-label="Voir le plan de la séance"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-foreground hover:bg-secondary/80 active:scale-95 transition-all"
          >
            <ListChecks className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenRest}
            aria-label="Démarrer le chrono de repos"
            className="flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
          >
            <TimerIcon className="h-4 w-4" />
            <span className="text-sm font-bold tabular-nums">{formatChrono(timerDuration)}</span>
          </button>
        </div>
      </div>

      {/* Barre de progression fine — remplace l ancien cercle */}
      <div className="h-1 w-full rounded-full bg-secondary/60 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
