import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Minus, Plus } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface TimerProps {
  onComplete?: () => void;
  className?: string;
}

const MIN_DURATION = 5;
const MAX_DURATION = 300;
const STEP = 5;

export function Timer({ onComplete, className = '' }: TimerProps) {
  const { seconds, isRunning, duration, start, pause, reset, setDuration, formattedTime } = useTimer({
    initialSeconds: 90,
    onComplete,
  });
  const [showSettings, setShowSettings] = useState(false);

  const progress = (seconds / duration) * 100;

  const adjustDuration = (delta: number) => {
    const newDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration + delta));
    setDuration(newDuration);
  };

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
          className={`h-10 w-10 ${showSettings ? 'bg-secondary' : ''}`}
        >
          <span className="text-xs font-medium">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
        </Button>
      </div>

      {/* Duration adjustment - granular control */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs space-y-4"
        >
          {/* Quick adjust buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustDuration(-STEP)}
              disabled={duration <= MIN_DURATION}
              className="h-9 w-9"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <span className="text-lg font-bold tabular-nums min-w-[80px] text-center">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustDuration(STEP)}
              disabled={duration >= MAX_DURATION}
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Slider for fine control */}
          <div className="px-2">
            <Slider
              value={[duration]}
              min={MIN_DURATION}
              max={MAX_DURATION}
              step={STEP}
              onValueChange={([value]) => setDuration(value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5s</span>
              <span>5min</span>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[30, 60, 90, 120, 180].map((d) => (
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
          </div>
        </motion.div>
      )}
    </div>
  );
}
