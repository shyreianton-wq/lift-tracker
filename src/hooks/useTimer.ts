import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialSeconds?: number;
  onComplete?: () => void;
}

export function useTimer({ initialSeconds = 90, onComplete }: UseTimerOptions = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio context for timer sound
    audioRef.current = new Audio();
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleHR7dZekrbOxr6eekY6KiImKi42QlJqeo6qxtr2+vby6tbCsqKSkpKWnqa2xt7u+wMLDw8LAvru4tLCsqKWjo6OkpqmttLm+wcPExMTDwb67uLSwr6ynpKKio6WnqrG4vMDDxcXFxMK/vLm1sq+sqaalpaanqq62u7/CxMXGxcTCv7y5tbKvrqyqqamqqq2zub3BxMbHx8bEwr+8uLWyr66sq6qqqquut7q+wsTGx8fGxcO/vLm2s7Cvrayrq6usrrW5vcHEx8jIx8bEwL27uLWzsK6trKusrK60uL3Bw8bIycjHxcK/vLm2s7GvrqysrKyutLi9wcTGyMnJyMbDwLy5trOxr66trKysrrS4vMDDxsjKycnHxMC9uri1s7CuraysrK60uLzAwsXHycnJyMbDv7y5trSxr66trK2usLe7v8LFx8nKycjGw7+8ubazsa+uraysrrC4u7/Cxs7IycnIxsO/vLm2s7GvrqysrK6xt7u/wsbHycnJx8bDv7y5trSxr66trK2usLe7v8LFx8nKycjGw7+8ubazsa+uraysrrC3u7/CxsjKycnIxsO/vLm2tLGvrqysra6wt7u/wsbIycnJx8bDv7y5trOxr66srK2usr7CxsjJycnJyMbDv7y5trSxr66srK2usr7CxsjJycnJyMbDv7y5trSxr66srK2usr7CxsjJycnJyMbDv7y5trSxr66srK2usr7CxsjJycnIyMXCv7y5trSxr62srK2usr7CxsjJycnIyMXCv7y5trSxr62srK2usr7CxsjJycnIx8XCv7y4trOwr62srK2usr7Cw8bIycnIx8XCv7y4tbOwr62srK2usr7CxsjJycnIx8XCv7y4tbOwrq2rq6ystr7CxsjJycnIx8XCv7y4tbOwrq2rq6ystr/Cw8bHyMjHxsXCv7y4tbOwrq2rq6ystr/Cw8bHyMjHxcPAvrq3tLKvrqyrq6ust77CxcbHx8fGxMLAvru4tbKvrqyrq6ust77BxMbHx8fGxMLAvru3tLKvrqyrq6ust77BxMbHx8fGxMLAvru3tLKvrqyrq6usub/CxMbHx8fGxMG/vLm2s7CuraysrK24vsPFxsfHx8bEwL27uLWysK6srKysrrm/w8XGx8fGxcPAvrq3tLGvrqysrK25v8PFxsfHxsXDwL66t7Sxrq2srKytuL/DxcbHx8bFw8C9ure0sa6trKysrrm/w8XGx8fGxcPAvbq3tLGurayrrK24vsLFxsfHxsXDwL26t7Sxrq2srKytuL/CxcbHx8bFw8C9ure0sa6trKysrbi/wsXGx8fGxcPAvbq3tLGuraysrK24vsLFxsfHxsXDwL26t7Sxrq2srKytuL/CxcbHx8bFw8C9ure0sa6trKysrbi+wsXGx8fGxcPAvbq3tLGuraysrK24vsLFxsbGxcXDwL26t7Sxrq2srKytuL7CxcbGxsbFw8C9ure0sa6trKysrbi+wsXGxsbFxMPAvbq3tLGuraysrK24vsLExcbGxcXEwb26t7Sxrq2srKytuL7CxcbGxsXEwb26t7Sxrq2srKytuL7Bw8XGxsXEwb26t7Sxrq2srKysub7Bw8XGxcXEwb26t7Sxrq2srKysu7/Bw8TFxcTDwL26t7Sxrq2srKysu77Aw8TExMTDwL26t7Sxrq6srKysu77Aw8TExMTDwL26t7Sxrq6srKysu77Aw8TExMTCwL26trSxrq6srKysu77Aw8TExMTCwL26trSxrq6srKysu77/wMPDw8PCwL26trSxrq6srKysvL7/wMPDw8PCwL26trSxrq6srKysvL7/wMPDw8PCwL26trSxrq6srKysvL7/wMPDw8PCwL26trSxrq6srKysvL7/wMPDw8PCwL26trSxrq6srKysvL7/wMPDw8PCwL26trSxrq6srKysvL4=';
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onComplete, seconds]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(duration);
  }, [duration]);

  const setTimerDuration = useCallback((newDuration: number) => {
    setDuration(newDuration);
    setSeconds(newDuration);
    setIsRunning(false);
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
    setDuration: setTimerDuration,
    formatTime,
    formattedTime: formatTime(seconds),
  };
}
