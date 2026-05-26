import { Program, WorkoutHistory } from '@/types/workout';

// True if at least one history entry was logged under this exact exerciseName.
// Strict `===` match — no normalization beyond what's stored.
export function hasHistoryForExerciseName(history: WorkoutHistory[], name: string): boolean {
  if (!name) return false;
  return history.some(h => h.exerciseName === name);
}

// True if any program/rotationGroup defines an exercise with this exact name.
export function programsContainExerciseName(programs: Program[], name: string): boolean {
  if (!name) return false;
  for (const p of programs) {
    for (const s of p.sessions) {
      if (s.exercises.some(e => e.name === name)) return true;
    }
    for (const rg of p.rotationGroups || []) {
      if (rg.exercises.some(e => e.name === name)) return true;
    }
  }
  return false;
}

// Convenience: a name is "known" if it appears in history OR in any program.
// When `true`, a rename to that name is unambiguously a replacement (no dialog).
export function isExerciseNameKnown(
  history: WorkoutHistory[],
  programs: Program[],
  name: string,
): boolean {
  return hasHistoryForExerciseName(history, name) || programsContainExerciseName(programs, name);
}

export function countExerciseOccurrences(program: Program, exerciseName: string): number {
  return program.sessions.filter(session =>
    session.exercises.some(ex => ex.name === exerciseName)
  ).length;
}

export function getAllExerciseNames(program: Program): string[] {
  const names = new Set<string>();
  for (const session of program.sessions) {
    for (const ex of session.exercises) {
      names.add(ex.name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
}

export function renameExerciseInProgram(
  program: Program,
  exerciseId: string,
  oldName: string,
  newName: string,
  propagate: boolean
): Program {
  return {
    ...program,
    sessions: program.sessions.map(session => ({
      ...session,
      exercises: session.exercises.map(ex => {
        if (propagate && ex.name === oldName) {
          return { ...ex, name: newName };
        }
        if (!propagate && ex.id === exerciseId) {
          return { ...ex, name: newName };
        }
        return ex;
      }),
    })),
  };
}
