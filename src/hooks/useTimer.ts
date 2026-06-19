import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialSeconds?: number;
  onComplete?: () => void;
  allowOvertime?: boolean; // après 0, continue à compter en négatif (overtime)
}

export function useTimer({ initialSeconds = 90, onComplete, allowOvertime = false }: UseTimerOptions = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDurationState] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(initialSeconds);
  const onCompleteRef = useRef(onComplete);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepedRef = useRef(false);

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
        const raw = startRemaining - elapsed;
        const remaining = allowOvertime ? Math.round(raw) : Math.max(0, Math.round(raw));
        setSeconds(remaining);

        if (raw <= 0 && !beepedRef.current) {
          beepedRef.current = true;
          playBeep();
          onCompleteRef.current?.();
          if (!allowOvertime) {
            setIsRunning(false);
            pausedRemainingRef.current = 0;
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      }, 250);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, playBeep, allowOvertime]);

  const start = useCallback(() => {
    warmAudio();
    if (!allowOvertime && pausedRemainingRef.current <= 0) {
      pausedRemainingRef.current = duration;
      setSeconds(duration);
    }
    setIsRunning(true);
  }, [duration, warmAudio, allowOvertime]);

  const pause = useCallback(() => {
    warmAudio();
    if (startedAtRef.current) {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      pausedRemainingRef.current = allowOvertime ? (pausedRemainingRef.current - elapsed) : Math.max(0, pausedRemainingRef.current - elapsed);
    }
    setIsRunning(false);
  }, [warmAudio, allowOvertime]);

  const reset = useCallback(() => {
    warmAudio();
    setIsRunning(false);
    startedAtRef.current = null;
    pausedRemainingRef.current = duration;
    setSeconds(duration);
    beepedRef.current = false;
  }, [duration, warmAudio]);

  const setDuration = useCallback((newDuration: number) => {
    setDurationState(newDuration);
    setSeconds(newDuration);
    setIsRunning(false);
    startedAtRef.current = null;
    pausedRemainingRef.current = newDuration;
    beepedRef.current = false;
  }, []);

  const formatTime = useCallback((secs: number) => {
    const sign = secs < 0 ? '-' : '';
    const abs = Math.abs(secs);
    const mins = Math.floor(abs / 60);
    const remainingSecs = abs % 60;
    return `${sign}${mins}:${remainingSecs.toString().padStart(2, '0')}`;
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
