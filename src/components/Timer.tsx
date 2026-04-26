import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Minus, Plus, ChevronDown } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect } from 'react';

interface TimerProps {
  onComplete?: () => void;
  onStart?: () => void;
  className?: string;
  initialDuration?: number;
  compact?: boolean;
}

const MIN_DURATION = 5;
const MAX_DURATION = 300;
const STEP = 5;

export function Timer({ onComplete, onStart, className = '', initialDuration = 90, compact = false }: TimerProps) {
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { seconds, isRunning, duration, start, pause, reset, setDuration, formattedTime } = useTimer({
    initialSeconds: initialDuration,
    onComplete: () => {
      setTimerExpanded(false);
      setShowFlash(true);
      onComplete?.();
    },
  });

  // Auto-expand when timer starts
  useEffect(() => {
    if (isRunning) setTimerExpanded(true);
  }, [isRunning]);

  const progress = (seconds / duration) * 100;
  const isUrgent = seconds <= 10 && seconds > 0;

  const adjustDuration = (delta: number) => {
    const newDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration + delta));
    setDuration(newDuration);
  };

  if (compact) {
    return (
      <>
        {/* Flash overlay */}
        <AnimatePresence>
          {showFlash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.5, 0.85, 0] }}
              transition={{ duration: 0.7, times: [0, 0.15, 0.4, 0.6, 1] }}
              onAnimationComplete={() => setShowFlash(false)}
              className="fixed inset-0 z-[200] pointer-events-none"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(30 100% 70% / 0.85))' }}
            />
          )}
        </AnimatePresence>

        <div className={`${className}`}>
          <motion.div
            layout
            
            className="flex items-center justify-center gap-3"
          >
            {/* Circle */}
            <motion.div
              layout
              className="relative"
              animate={{
                width: isRunning ? 120 : 48,
                height: isRunning ? 120 : 48,
              }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={42} fill="none" stroke="hsl(var(--secondary))" strokeWidth={8} />
                <motion.circle
                  cx="50" cy="50" r={42}
                  fill="none"
                  stroke={isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  initial={false}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}` }}
                  transition={{ duration: 0.3 }}
                  className={isUrgent ? 'animate-pulse' : ''}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  className={`font-bold tabular-nums ${isUrgent ? 'text-destructive' : 'text-foreground'}`}
                  animate={{ fontSize: isRunning ? '2.5rem' : '0.875rem' }}
                  transition={{ duration: 0.35 }}
                  style={{ lineHeight: 1 }}
                >
                  {formattedTime}
                </motion.span>
              </div>
            </motion.div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={reset} className="h-8 w-8">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                onClick={isRunning ? pause : () => { start(); onStart?.(); }}
                className="rounded-full btn-primary-gradient h-9 w-9"
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className={`h-8 w-8 ${showSettings ? 'bg-secondary' : ''}`}
              >
                <span className="font-medium text-[10px]">
                  {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </span>
              </Button>
            </div>

            {/* Settings */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden w-full max-w-xs"
                >
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <Button variant="outline" size="icon" onClick={() => adjustDuration(-STEP)} disabled={duration <= MIN_DURATION} className="h-7 w-7">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold tabular-nums min-w-[52px] text-center">
                        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                      </span>
                      <Button variant="outline" size="icon" onClick={() => adjustDuration(STEP)} disabled={duration >= MAX_DURATION} className="h-7 w-7">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {[15, 30, 60, 90, 120, 180].map((d) => (
                        <Button
                          key={d}
                          variant={duration === d ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setDuration(d)}
                          className={`h-7 text-xs px-2 ${duration === d ? 'btn-primary-gradient' : ''}`}
                        >
                          {d >= 60 ? `${d / 60}min` : `${d}s`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </>
    );
  }

  // --- Non-compact (unchanged) ---
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            initial={false}
            animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}` }}
            transition={{ duration: 0.3 }}
            className={seconds <= 10 && seconds > 0 ? 'animate-pulse' : ''}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${seconds <= 10 && seconds > 0 ? 'text-primary' : 'text-foreground'}`}>
            {formattedTime}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={reset} className="h-10 w-10">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={isRunning ? pause : () => { start(); onStart?.(); }} className="h-12 w-12 rounded-full btn-primary-gradient">
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
        <Button
          variant="ghost" size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className={`h-10 w-10 ${showSettings ? 'bg-secondary' : ''}`}
        >
          <span className="text-xs font-medium">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
        </Button>
      </div>

      {showSettings && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={() => adjustDuration(-STEP)} disabled={duration <= MIN_DURATION} className="h-9 w-9">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold tabular-nums min-w-[80px] text-center">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="outline" size="icon" onClick={() => adjustDuration(STEP)} disabled={duration >= MAX_DURATION} className="h-9 w-9">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-2">
            <Slider value={[duration]} min={MIN_DURATION} max={MAX_DURATION} step={STEP} onValueChange={([value]) => setDuration(value)} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5s</span><span>5min</span></div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[15, 30, 60, 90, 120, 180].map((d) => (
              <Button key={d} variant={duration === d ? 'default' : 'secondary'} size="sm" onClick={() => setDuration(d)} className={duration === d ? 'btn-primary-gradient' : ''}>
                {d >= 60 ? `${d / 60}min` : `${d}s`}
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
