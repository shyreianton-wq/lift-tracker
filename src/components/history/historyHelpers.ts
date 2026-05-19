import { WorkoutHistory, Program } from '@/types/workout';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getExerciseName(programs: Program[], exerciseId: string, storedName?: string): string {
  // Prefer stored name (has resolved rotation name)
  if (storedName) return storedName;
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) {
          // For rotation slots, check if we can resolve from group
          if (e.rotationGroupRef) {
            const rg = p.rotationGroups?.find(g => g.id === e.rotationGroupRef);
            if (rg) return '🔄 ' + rg.name;
          }
          return e.name;
        }
      }
    }
  }
  return '?';
}

export function getExerciseMode(programs: Program[], exerciseId: string): 'reps' | 'time' {
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) return e.mode || 'reps';
      }
    }
  }
  return 'reps';
}

export type HistoryEntry = WorkoutHistory;
