import { Program } from '@/types/workout';

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
