import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Plus, Minus, X, Pause, Play, SkipForward } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { SetType } from '@/types/workout';

interface RestOverlayProps {
  open: boolean;
  durationSec: number;
  onClose: () => void;
  // Contexte pour rappeler ce qu on vient de faire / ce qui vient
  exerciseName?: string;
  setLabel?: string;
  setType?: SetType;
  previousPerf?: { weight: number; reps: number; rpe?: number };
}

// Pleine page, fond très sombre — pour que le chrono soit lisible à 2m sans avoir à reprendre le tel.
// Auto-démarre le timer à l ouverture. La fermeture (tap croix / Skip / fin du timer) ne valide PAS la série,
// elle ferme juste l overlay — l état de la série en cours est conservé par le parent.
export function RestOverlay({
  open, durationSec, onClose,
  exerciseName, setLabel, setType, previousPerf,
}: RestOverlayProps) {
  const timer = useTimer({ initialSeconds: durationSec, onComplete: undefined });

  // Re-cale la durée et démarre à chaque ouverture (cas myo-rep: re-relance entre mini-séries)
  useEffect(() => {
    if (!open) return;
    timer.setDuration(durationSec);
    // démarre au prochain tick pour laisser setDuration commit la state
    const id = setTimeout(() => timer.start(), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationSec]);

  const remaining = timer.seconds;
  const progress = useMemo(() => durationSec > 0 ? (remaining / durationSec) * 100 : 0, [remaining, durationSec]);
  const isUrgent = remaining > 0 && remaining <= 5;

  const typeBadge = setType === 'myo-rep' ? { label: 'MYO', color: 'bg-orange-500/30 text-orange-300' }
                  : setType === 'hypertrophie' ? { label: 'HYP', color: 'bg-blue-500/30 text-blue-300' }
                  : { label: 'FORCE', color: 'bg-emerald-500/30 text-emerald-300' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
        >
          {/* Bouton fermer top-right */}
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={() => { timer.pause(); onClose(); }}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20"
              aria-label="Fermer le chrono"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Timer XXL — lisible à 2m */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div
              key={remaining}
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              className={`font-mono font-black tabular-nums tracking-tight ${isUrgent ? 'text-red-400' : 'text-white'}`}
              style={{ fontSize: 'min(36vw, 220px)', lineHeight: 1 }}
            >
              {timer.formattedTime}
            </motion.div>

            {/* Barre de progression visuelle */}
            <div className="w-full max-w-md mt-6 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isUrgent ? 'bg-red-400' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Contexte de la série en cours */}
            {(exerciseName || setLabel) && (
              <div className="mt-10 text-center">
                {exerciseName && (
                  <div className="text-2xl font-bold text-white/90">{exerciseName}</div>
                )}
                <div className="mt-2 flex items-center justify-center gap-3 text-base text-white/70">
                  {setLabel && <span>{setLabel}</span>}
                  <span className={`px-2 py-0.5 rounded uppercase font-bold text-xs ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                </div>
                {previousPerf && (
                  <div className="mt-3 text-sm text-white/50">
                    Préc séance : {previousPerf.weight}kg × {previousPerf.reps}
                    {previousPerf.rpe ? ` @${previousPerf.rpe}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons bas — pause/play, ±15s, skip */}
          <div className="p-6 pb-10">
            <div className="flex justify-center items-center gap-3">
              <button
                type="button"
                onClick={() => timer.setDuration(Math.max(5, remaining - 15))}
                className="flex items-center gap-1 px-4 h-14 rounded-2xl bg-white/10 text-white text-lg font-semibold hover:bg-white/20"
              >
                <Minus className="h-5 w-5" /> 15s
              </button>

              <button
                type="button"
                onClick={() => timer.isRunning ? timer.pause() : timer.start()}
                className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90"
                aria-label={timer.isRunning ? 'Pause' : 'Démarrer'}
              >
                {timer.isRunning ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
              </button>

              <button
                type="button"
                onClick={() => timer.setDuration(remaining + 15)}
                className="flex items-center gap-1 px-4 h-14 rounded-2xl bg-white/10 text-white text-lg font-semibold hover:bg-white/20"
              >
                <Plus className="h-5 w-5" /> 15s
              </button>
            </div>

            <button
              type="button"
              onClick={() => { timer.pause(); onClose(); }}
              className="mt-4 mx-auto flex items-center gap-2 text-white/60 hover:text-white text-sm"
            >
              <SkipForward className="h-4 w-4" /> Passer
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
