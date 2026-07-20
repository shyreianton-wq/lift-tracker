import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Check, RotateCcw, Minus, Plus } from 'lucide-react';

interface StopwatchProps {
  onComplete: (durationSeconds: number) => void;
  targetDuration?: number;
}

export function Stopwatch({ onComplete, targetDuration }: StopwatchProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsedMs;
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  }, [isRunning, elapsedMs]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedMs(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Ajuste la durée du chrono (± secondes) — reste cohérent si le chrono tourne.
  const adjust = useCallback((deltaSec: number) => {
    setElapsedMs(prev => {
      const next = Math.max(0, prev + deltaSec * 1000);
      startTimeRef.current = Date.now() - next;
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    pause();
    const seconds = Math.round(elapsedMs / 1000);
    onComplete(seconds);
    reset();
  }, [elapsedMs, onComplete, pause, reset]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  };

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const isOverTarget = targetDuration && elapsedSeconds >= targetDuration;

  return (
    <div className="flex flex-col items-center gap-3">
      {targetDuration && (
        <div className="text-sm text-muted-foreground">
          Objectif: {Math.floor(targetDuration / 60)}:{(targetDuration % 60).toString().padStart(2, '0')}
        </div>
      )}
      <div className="flex items-center justify-center gap-3">
        <Button onClick={() => adjust(-5)} variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="-5 s">
          <Minus className="h-4 w-4" />
        </Button>
        <div className={`text-4xl font-mono font-bold tabular-nums min-w-[6.5ch] text-center ${isOverTarget ? 'text-green-500' : ''}`}>
          {formatTime(elapsedMs)}
        </div>
        <Button onClick={() => adjust(5)} variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="+5 s">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        {!isRunning ? (
          <Button onClick={start} variant="outline" size="icon">
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={pause} variant="outline" size="icon">
            <Pause className="h-4 w-4" />
          </Button>
        )}
        <Button onClick={reset} variant="outline" size="icon" disabled={elapsedMs === 0}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={validate} variant="default" size="icon" disabled={elapsedMs === 0}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
