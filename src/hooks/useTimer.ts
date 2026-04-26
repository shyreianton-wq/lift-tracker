import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialSeconds?: number;
  onComplete?: () => void;
}

export function useTimer({ initialSeconds = 90, onComplete }: UseTimerOptions = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDurationState] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(initialSeconds);
  const onCompleteRef = useRef(onComplete);
  const audioCtxRef = useRef<AudioContext | null>(null);

  onCompleteRef.current = onComplete;

  // Keep a warm AudioContext (avoids autoplay policy issues)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Warm up AudioContext on first user interaction (start/pause/reset)
  const warmAudio = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }, [getAudioCtx]);

  // Play loud beep via Web Audio API
  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playTone = (time: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        osc.start(time);
        osc.stop(time + dur);
      };
      const now = ctx.currentTime;
      // 5 beeps pattern: 3 fast + pause + 2 high
      playTone(now, 880, 0.15);
      playTone(now + 0.18, 880, 0.15);
      playTone(now + 0.36, 880, 0.15);
      playTone(now + 0.7, 1200, 0.25);
      playTone(now + 1.0, 1200, 0.35);

      // Also try vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    } catch (e) {
      console.warn('Beep failed:', e);
    }
  }, [getAudioCtx]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      startedAtRef.current = Date.now();
      const startRemaining = pausedRemainingRef.current;

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAtRef.current!) / 1000;
        const remaining = Math.max(0, Math.round(startRemaining - elapsed));
        setSeconds(remaining);

        if (remaining <= 0) {
          setIsRunning(false);
          pausedRemainingRef.current = 0;
          playBeep();
          onCompleteRef.current?.();
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 250);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, playBeep]);

  const start = useCallback(() => {
    warmAudio();
    if (pausedRemainingRef.current <= 0) {
      pausedRemainingRef.current = duration;
      setSeconds(duration);
    }
    setIsRunning(true);
  }, [duration, warmAudio]);

  const pause = useCallback(() => {
    warmAudio();
    if (startedAtRef.current) {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      pausedRemainingRef.current = Math.max(0, pausedRemainingRef.current - elapsed);
    }
    setIsRunning(false);
  }, [warmAudio]);

  const reset = useCallback(() => {
    warmAudio();
    setIsRunning(false);
    startedAtRef.current = null;
    pausedRemainingRef.current = duration;
    setSeconds(duration);
  }, [duration, warmAudio]);

  const setDuration = useCallback((newDuration: number) => {
    setDurationState(newDuration);
    setSeconds(newDuration);
    setIsRunning(false);
    startedAtRef.current = null;
    pausedRemainingRef.current = newDuration;
  }, []);

  const formatTime = useCallback((secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isRunning,
    duration,
    start,
    pause,
    reset,
    setDuration,
    formatTime,
    formattedTime: formatTime(seconds),
  };
}
