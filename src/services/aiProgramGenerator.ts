import { Program, Session, Exercise, WorkoutSet, SetType } from '@/types/workout';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Goal = 'hypertrophie' | 'force' | 'recomposition' | 'endurance';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Equipment {
  barbell: boolean;
  dumbbells: boolean;
  cables: boolean;
  machines: boolean;
  pullupBar: boolean;
  bodyweight: boolean;
}

export interface AIBuilderInput {
  goal: Goal;
  level: Level;
  daysPerWeek: number; // 2-6
  timePerSession: number; // 30-90 min
  equipment: Equipment;
  injuries: string[];
  experience?: string;
}

// ─── Exercise Database ────────────────────────────────────────────────────────

export interface ExerciseDef {
  name: string;
  muscleGroup: string;
  type: 'compound' | 'secondary' | 'isolation';
  equipment: (keyof Equipment)[];
  mode: 'reps' | 'time';
}

export const EXERCISES: ExerciseDef[] = [
  // Chest
  { name: 'Développé couché Barre', muscleGroup: 'chest', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Développé couché Haltères', muscleGroup: 'chest', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Développé incliné Haltères', muscleGroup: 'chest', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Développé incliné Barre', muscleGroup: 'chest', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Écarté Poulie', muscleGroup: 'chest', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  { name: 'Écarté Machine', muscleGroup: 'chest', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  { name: 'Pompes', muscleGroup: 'chest', type: 'compound', equipment: ['bodyweight'], mode: 'reps' },
  // Back
  { name: 'Rowing Barre', muscleGroup: 'back', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Rowing Haltères', muscleGroup: 'back', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Tirage vertical Poulie', muscleGroup: 'back', type: 'secondary', equipment: ['cables'], mode: 'reps' },
  { name: 'Tractions', muscleGroup: 'back', type: 'compound', equipment: ['pullupBar'], mode: 'reps' },
  { name: 'Rowing Poulie basse', muscleGroup: 'back', type: 'secondary', equipment: ['cables'], mode: 'reps' },
  { name: 'Tirage vertical Machine', muscleGroup: 'back', type: 'secondary', equipment: ['machines'], mode: 'reps' },
  // Shoulders
  { name: 'Développé militaire Barre', muscleGroup: 'shoulders', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Développé militaire Haltères', muscleGroup: 'shoulders', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Élévations latérales Haltères', muscleGroup: 'shoulders', type: 'isolation', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Élévations latérales Poulie', muscleGroup: 'shoulders', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  { name: 'Face Pull', muscleGroup: 'shoulders', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  // Quads
  { name: 'Squat Barre', muscleGroup: 'quads', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Goblet Squat', muscleGroup: 'quads', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Presse à cuisses', muscleGroup: 'quads', type: 'secondary', equipment: ['machines'], mode: 'reps' },
  { name: 'Leg Extension', muscleGroup: 'quads', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  { name: 'Fentes Haltères', muscleGroup: 'quads', type: 'secondary', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quads', type: 'secondary', equipment: ['dumbbells'], mode: 'reps' },
  // Hamstrings
  { name: 'Romanian Deadlift Barre', muscleGroup: 'hamstrings', type: 'compound', equipment: ['barbell'], mode: 'reps' },
  { name: 'Romanian Deadlift Haltères', muscleGroup: 'hamstrings', type: 'compound', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Leg Curl Allongé', muscleGroup: 'hamstrings', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  { name: 'Leg Curl Assis', muscleGroup: 'hamstrings', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  // Glutes
  { name: 'Hip Thrust', muscleGroup: 'glutes', type: 'secondary', equipment: ['barbell'], mode: 'reps' },
  // Triceps
  { name: 'Dips', muscleGroup: 'triceps', type: 'secondary', equipment: ['bodyweight'], mode: 'reps' },
  { name: 'Triceps Pushdown Corde', muscleGroup: 'triceps', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  { name: 'Extensions Overhead Haltère', muscleGroup: 'triceps', type: 'isolation', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Skullcrusher', muscleGroup: 'triceps', type: 'isolation', equipment: ['barbell'], mode: 'reps' },
  // Biceps
  { name: 'Curl Barre', muscleGroup: 'biceps', type: 'isolation', equipment: ['barbell'], mode: 'reps' },
  { name: 'Curl Haltères', muscleGroup: 'biceps', type: 'isolation', equipment: ['dumbbells'], mode: 'reps' },
  { name: 'Curl Poulie', muscleGroup: 'biceps', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  { name: 'Curl Marteau', muscleGroup: 'biceps', type: 'isolation', equipment: ['dumbbells'], mode: 'reps' },
  // Calves
  { name: 'Mollets Debout', muscleGroup: 'calves', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  { name: 'Mollets Assis', muscleGroup: 'calves', type: 'isolation', equipment: ['machines'], mode: 'reps' },
  // Abs
  { name: 'Crunch Poulie', muscleGroup: 'abs', type: 'isolation', equipment: ['cables'], mode: 'reps' },
  { name: 'Relevé de jambes', muscleGroup: 'abs', type: 'isolation', equipment: ['pullupBar', 'bodyweight'], mode: 'reps' },
];

// ─── Volume Config ────────────────────────────────────────────────────────────

// Base weekly sets per level
const WEEKLY_SETS_BASE: Record<Level, { big: [number, number]; small: [number, number] }> = {
  beginner:     { big: [10, 12], small: [6, 8] },
  intermediate: { big: [14, 18], small: [9, 12] },
  advanced:     { big: [18, 22], small: [12, 15] },
};

// Volume multiplier per muscle group (1.0 = base, 1.5 = 50% more)
// Back needs ~1.5x chest volume (larger muscle, vertical + horizontal planes)
// Back should have at least 1.5x the weekly set volume of chest
const BACK_TO_CHEST_MIN_RATIO = 1.5;

const REP_RANGES: Record<Goal, Record<'compound' | 'secondary' | 'isolation', string>> = {
  hypertrophie: { compound: '8-12', secondary: '10-15', isolation: '12-15' },
  force:        { compound: '3-6', secondary: '6-8', isolation: '8-12' },
  recomposition:{ compound: '6-10', secondary: '8-12', isolation: '10-15' },
  endurance:    { compound: '12-20', secondary: '15-20', isolation: '15-25' },
};

const SETS_PER_EXERCISE: Record<Level, Record<'compound' | 'secondary' | 'isolation', number>> = {
  beginner:     { compound: 3, secondary: 3, isolation: 3 },
  intermediate: { compound: 4, secondary: 3, isolation: 3 },
  advanced:     { compound: 4, secondary: 4, isolation: 4 },
};

const BIG_MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders'];
const SMALL_MUSCLES = ['biceps', 'triceps', 'calves', 'abs'];

// ─── Split Selection ──────────────────────────────────────────────────────────

interface SplitDay {
  name: string;
  muscleGroups: string[];
}

function selectSplit(days: number): SplitDay[] {
  switch (days) {
    case 2:
      return [
        { name: 'Full Body A', muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps'] },
        { name: 'Full Body B', muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'calves', 'abs'] },
      ];
    case 3:
      return [
        { name: 'Full Body A', muscleGroups: ['chest', 'back', 'quads', 'shoulders', 'triceps', 'calves'] },
        { name: 'Full Body B', muscleGroups: ['back', 'chest', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'abs'] },
        { name: 'Full Body C', muscleGroups: ['quads', 'chest', 'back', 'hamstrings', 'shoulders', 'triceps', 'biceps'] },
      ];
    case 4:
      return [
        { name: 'Upper A', muscleGroups: ['chest', 'back', 'shoulders', 'triceps', 'biceps'] },
        { name: 'Lower A', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
        { name: 'Upper B', muscleGroups: ['back', 'chest', 'shoulders', 'biceps', 'triceps'] },
        { name: 'Lower B', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      ];
    case 5:
      return [
        { name: 'Push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull', muscleGroups: ['back', 'biceps', 'shoulders'] },
        { name: 'Legs', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
        { name: 'Upper', muscleGroups: ['chest', 'back', 'shoulders', 'triceps', 'biceps'] },
        { name: 'Lower', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      ];
    case 6:
      return [
        { name: 'Push A', muscleGroups: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull A', muscleGroups: ['back', 'biceps', 'shoulders'] },
        { name: 'Legs A', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
        { name: 'Push B', muscleGroups: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull B', muscleGroups: ['back', 'biceps', 'shoulders'] },
        { name: 'Legs B', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      ];
    default:
      return selectSplit(3);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function pickExercise(
  muscle: string,
  type: 'compound' | 'secondary' | 'isolation',
  equipment: Equipment,
  used: Set<string>
): ExerciseDef | null {
  const available = EXERCISES.filter(
    (e) =>
      e.muscleGroup === muscle &&
      e.type === type &&
      !used.has(e.name) &&
      e.equipment.some((eq) => equipment[eq])
  );
  if (available.length === 0) {
    // Fallback: try any type for this muscle
    const fallback = EXERCISES.filter(
      (e) => e.muscleGroup === muscle && !used.has(e.name) && e.equipment.some((eq) => equipment[eq])
    );
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  }
  return available[Math.floor(Math.random() * available.length)];
}

function parseReps(repsStr: string): number {
  if (repsStr.endsWith('s')) return parseInt(repsStr);
  const parts = repsStr.split('-').map(Number);
  if (parts.length === 2) return Math.round((parts[0] + parts[1]) / 2);
  return parts[0] || 10;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateProgram(input: AIBuilderInput): Program {
  const split = selectSplit(input.daysPerWeek);
  const weeklyVolume = WEEKLY_SETS_BASE[input.level];
  const repRanges = REP_RANGES[input.goal];
  const setsConfig = SETS_PER_EXERCISE[input.level];

  // Time estimation per set (execution + rest):
  // Force: 45s exec + 180s rest = 225s/set (~3.75min)
  // Hypertrophie: 75s exec + 120s rest = 195s/set (~3.25min)
  // + ~2min transition between exercises
  const TRANSITION_TIME = 2; // minutes between exercises
  const TIME_PER_SET: Record<string, number> = {
    force: 3.75,       // 225s
    hypertrophie: 3.25, // 195s
    'myo-rep': 1,      // 60s
  };
  // Estimate based on goal: how many sets fit in the time budget?
  const avgTimePerSet = input.goal === 'force' ? TIME_PER_SET.force : TIME_PER_SET.hypertrophie;
  const avgSetsPerExercise = input.level === 'beginner' ? 3 : input.level === 'intermediate' ? 3.5 : 4;
  const timePerExercise = (avgTimePerSet * avgSetsPerExercise) + TRANSITION_TIME;
  const maxExercisesPerSession = Math.max(3, Math.min(8, Math.floor(input.timePerSession / timePerExercise)));

  // Track weekly sets per muscle to hit volume targets
  const muscleFrequency: Record<string, number> = {};
  split.forEach((day) => {
    day.muscleGroups.forEach((mg) => {
      muscleFrequency[mg] = (muscleFrequency[mg] || 0) + 1;
    });
  });

  // Helper to create an exercise entry
  function makeExercise(exDef: ExerciseDef, numSets: number, reps: string, isOptional: boolean): Exercise {
    const setType: SetType = (exDef.type === 'compound' && input.goal === 'force') ? 'force' : 'hypertrophie';
    return {
      id: generateId(),
      name: exDef.name,
      mode: exDef.mode,
      optional: isOptional || undefined,
      sets: Array.from({ length: numSets }, () => ({
        id: generateId(),
        type: setType,
        targetReps: parseReps(reps),
        targetWeight: 0,
        isCompleted: false,
      })),
    };
  }

  const sessions: Session[] = split.map((day) => {
    const usedExercises = new Set<string>();
    const exercises: Exercise[] = [];

    // Priority order:
    // 1. Compound for each big muscle (in order of muscle groups listed)
    // 2. Isolation for big muscles (if volume budget allows)
    // 3. Isolation for small muscles
    // Then: optional extras beyond the time budget

    // Separate big and small muscles maintaining order
    const bigMuscles = day.muscleGroups.filter(m => BIG_MUSCLES.includes(m));
    const smallMuscles = day.muscleGroups.filter(m => SMALL_MUSCLES.includes(m));

    function getSets(_muscle: string, exType: 'compound' | 'secondary' | 'isolation'): number {
      return setsConfig[exType];
    }

    // Phase 1: Compound for each big muscle
    for (const muscle of bigMuscles) {
      if (exercises.length >= maxExercisesPerSession) break;
      const ex = pickExercise(muscle, 'compound', input.equipment, usedExercises);
      if (ex) {
        usedExercises.add(ex.name);
        exercises.push(makeExercise(ex, getSets(muscle, ex.type), repRanges[ex.type], false));
      }
    }

    // Phase 2: Isolation for big muscles (secondary movement)
    for (const muscle of bigMuscles) {
      if (exercises.length >= maxExercisesPerSession) break;
      const ex = pickExercise(muscle, 'isolation', input.equipment, usedExercises)
        || pickExercise(muscle, 'secondary', input.equipment, usedExercises);
      if (ex) {
        usedExercises.add(ex.name);
        exercises.push(makeExercise(ex, getSets(muscle, ex.type), repRanges[ex.type], false));
      }
    }

    // Phase 3: Small muscles (isolation)
    for (const muscle of smallMuscles) {
      if (exercises.length >= maxExercisesPerSession) break;
      const ex = pickExercise(muscle, 'isolation', input.equipment, usedExercises);
      if (ex) {
        usedExercises.add(ex.name);
        exercises.push(makeExercise(ex, getSets(muscle, ex.type), repRanges[ex.type], false));
      }
    }

    // Phase 4: Optional extras (1-2 exercises that would fit with +15min)
    const allRemainingMuscles = [...bigMuscles, ...smallMuscles];
    let optionalCount = 0;
    for (const muscle of allRemainingMuscles) {
      if (optionalCount >= 2) break;
      const ex = pickExercise(muscle, 'isolation', input.equipment, usedExercises)
        || pickExercise(muscle, 'secondary', input.equipment, usedExercises);
      if (ex) {
        usedExercises.add(ex.name);
        const numSets = Math.max(2, setsConfig[ex.type] - 1); // slightly less sets for optional
        exercises.push(makeExercise(ex, numSets, repRanges[ex.type], true));
        optionalCount++;
      }
    }

    return {
      id: generateId(),
      name: day.name,
      exercises,
    };
  });

  // Post-generation: ensure back has ~1.5x chest weekly volume (non-optional only)
  function countWeeklySets(muscleGroup: string, includeOptional: boolean = false): number {
    return sessions.reduce((total, s) =>
      total + s.exercises
        .filter(e => {
          if (!includeOptional && e.optional) return false;
          const def = EXERCISES.find(d => d.name === e.name);
          return def?.muscleGroup === muscleGroup;
        })
        .reduce((sum, e) => sum + e.sets.length, 0)
    , 0);
  }

  let chestSets = countWeeklySets('chest');
  let backSets = countWeeklySets('back');

  if (backSets < Math.round(chestSets * BACK_TO_CHEST_MIN_RATIO)) {
    const BACK_EX_SETS = 4;

    // Step 1: Find a back exercise to add
    const usedBackNames = new Set<string>();
    sessions.forEach(s => s.exercises.forEach(e => {
      const def = EXERCISES.find(d => d.name === e.name);
      if (def?.muscleGroup === 'back') usedBackNames.add(e.name);
    }));

    const extraBack = EXERCISES.find(e =>
      e.muscleGroup === 'back' && !usedBackNames.has(e.name) && e.equipment.some(eq => input.equipment[eq])
    );

    if (extraBack) {
      // Find the best session to add it to (one with back exercises, fewest total)
      const sessionsWithBack = sessions
        .map((s, si) => ({ session: s, idx: si }))
        .filter(s => s.session.exercises.some(e => EXERCISES.find(d => d.name === e.name)?.muscleGroup === 'back'))
        .sort((a, b) =>
          a.session.exercises.filter(e => !e.optional).length - b.session.exercises.filter(e => !e.optional).length
        );

      if (sessionsWithBack.length > 0) {
        const targetSession = sessionsWithBack[0];
        const nonOptionalCount = targetSession.session.exercises.filter(e => !e.optional).length;

        // Step 2: If over budget, trim chest sets to make room
        if (nonOptionalCount >= maxExercisesPerSession) {
          // Collect all non-optional chest exercises across ALL sessions, sorted by most sets first
          const chestExercises: { sessionIdx: number; exIdx: number; sets: number }[] = [];
          sessions.forEach((s, si) => {
            s.exercises.forEach((e, ei) => {
              const def = EXERCISES.find(d => d.name === e.name);
              if (def?.muscleGroup === 'chest' && !e.optional && e.sets.length > 2) {
                chestExercises.push({ sessionIdx: si, exIdx: ei, sets: e.sets.length });
              }
            });
          });
          chestExercises.sort((a, b) => b.sets - a.sets);

          // Remove chest sets one at a time until we have room
          // We need: new back sets fit in time budget, AND ratio is ~1.5x
          let setsRemoved = 0;
          while (chestExercises.length > 0) {
            chestSets = countWeeklySets('chest');
            backSets = countWeeklySets('back') + BACK_EX_SETS;
            const currentRatio = chestSets > 0 ? backSets / chestSets : 999;

            // Stop if ratio is hit
            if (currentRatio >= BACK_TO_CHEST_MIN_RATIO) break;

            // Remove one set from the chest exercise with the most sets
            const target = chestExercises[0];
            const ex = sessions[target.sessionIdx].exercises[target.exIdx];
            if (ex.sets.length > 2) {
              ex.sets.pop();
              target.sets = ex.sets.length;
              setsRemoved++;
            }
            // Re-sort
            chestExercises.sort((a, b) => b.sets - a.sets);
            // Remove entries that hit minimum (2 sets)
            while (chestExercises.length > 0 && chestExercises[chestExercises.length - 1].sets <= 2) {
              chestExercises.pop();
            }
            // Safety: don't remove more than 6 sets total
            if (setsRemoved >= 6) break;
          }
        }

        // Step 3: Add the back exercise (always as required now)
        const setType: SetType = (extraBack.type === 'compound' && input.goal === 'force') ? 'force' : 'hypertrophie';
        const newEx: Exercise = {
          id: generateId(),
          name: extraBack.name,
          mode: extraBack.mode,
          sets: Array.from({ length: BACK_EX_SETS }, () => ({
            id: generateId(),
            type: setType,
            targetReps: parseReps(repRanges[extraBack.type]),
            targetWeight: 0,
            isCompleted: false,
          })),
        };

        // Insert before optional exercises
        const firstOptionalIdx = targetSession.session.exercises.findIndex(e => e.optional);
        if (firstOptionalIdx >= 0) {
          targetSession.session.exercises.splice(firstOptionalIdx, 0, newEx);
        } else {
          targetSession.session.exercises.push(newEx);
        }
      }
    }
  }

  const goalLabels: Record<Goal, string> = {
    hypertrophie: 'Hypertrophie',
    force: 'Force',
    recomposition: 'Recomposition',
    endurance: 'Endurance musculaire',
  };

  const levelLabels: Record<Level, string> = {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
  };

  return {
    id: generateId(),
    name: `Programme ${goalLabels[input.goal]} ${input.daysPerWeek}j`,
    description: `Programme généré — ${goalLabels[input.goal]} · ${levelLabels[input.level]} · ${input.daysPerWeek}j/sem · ${input.timePerSession}min`,
    createdAt: new Date().toISOString(),
    sessions,
  };
}
