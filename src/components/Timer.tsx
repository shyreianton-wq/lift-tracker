import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TimerProps {
  onComplete?: () => void;
  className?: string;
}

const PRESET_DURATIONS = [30, 60, 90, 120, 180, 300];

export function Timer({ onComplete, className = '' }: TimerProps) {
  const { seconds, isRunning, duration, start, pause, reset, setDuration, formattedTime } = useTimer({
    initialSeconds: 90,
    onComplete,
  });
  const [showSettings, setShowSettings] = useState(false);

  const progress = (seconds / duration) * 100;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            initial={false}
            animate={{
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}`,
            }}
            transition={{ duration: 0.3 }}
            className={seconds <= 10 && seconds > 0 ? 'animate-pulse' : ''}
          />
        </svg>
        
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${seconds <= 10 && seconds > 0 ? 'text-primary' : 'text-foreground'}`}>
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-10 w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={isRunning ? pause : start}
          className="h-12 w-12 rounded-full btn-primary-gradient"
        >
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="h-10 w-10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Duration presets */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {PRESET_DURATIONS.map((d) => (
            <Button
              key={d}
              variant={duration === d ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setDuration(d)}
              className={duration === d ? 'btn-primary-gradient' : ''}
            >
              {d >= 60 ? `${d / 60}min` : `${d}s`}
            </Button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
