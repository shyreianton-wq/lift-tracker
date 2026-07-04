import { WorkoutHistory, Program } from '@/types/workout';

export function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m}m` : `${m}m${sec}s`;
}

export function getExerciseName(programs: Program[], exerciseId: string, fallback?: string): string {
  if (fallback) return fallback;
  for (const p of programs) {
    for (const s of p.sessions) {
      const ex = s.exercises.find(e => e.id === exerciseId);
      if (ex) return ex.name;
    }
  }
  return '?';
}

export function getExerciseMode(programs: Program[], exerciseId: string): string {
  for (const p of programs) {
    for (const s of p.sessions) {
      const ex = s.exercises.find(e => e.id === exerciseId);
      if (ex) return ex.mode || 'reps';
    }
  }
  return 'reps';
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.round((Date.now() - then) / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.round(days/7)}sem`;
  if (days < 365) return `il y a ${Math.round(days/30)}mois`;
  return `il y a ${Math.round(days/365)}an`;
}

// ===========================================================================
// Groupement des entries d historique en "workouts" (séances effectivement
// réalisées). Une séance = entries consécutives séparées par moins de 30min.
// ===========================================================================

export interface GroupedWorkout {
  id: string;                  // identifiant stable (programId__sessionId__startDate)
  programId: string;
  sessionId: string;
  startedAt: string;           // ISO de la 1re entry
  endedAt: string;             // ISO de la dernière entry
  durationSec: number;
  sets: WorkoutHistory[];
}

export function groupIntoWorkouts(history: WorkoutHistory[]): GroupedWorkout[] {
  if (history.length === 0) return [];
  // Regroupement par (programme + séance + JOUR local) : toutes les séries d'un même
  // type de séance dans la même journée = UNE séance, même si on a entrelacé d'autres
  // séances entre-temps (ex: UPPER A → LOWER B → UPPER A ⇒ un seul UPPER A ce jour-là).
  const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const byKey = new Map<string, GroupedWorkout>();
  for (const h of sorted) {
    const d = new Date(h.completedAt); // jour LOCAL (fuseau du téléphone)
    const day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const key = `${h.programId}__${h.sessionId}__${day}`;
    const g = byKey.get(key);
    if (!g) {
      byKey.set(key, {
        id: key,
        programId: h.programId,
        sessionId: h.sessionId,
        startedAt: h.completedAt,
        endedAt: h.completedAt,
        durationSec: 0,
        sets: [h],
      });
    } else {
      g.sets.push(h);
      g.endedAt = h.completedAt; // sorted asc → h est le plus récent du groupe
      g.durationSec = Math.round((new Date(g.endedAt).getTime() - new Date(g.startedAt).getTime()) / 1000);
    }
  }
  // Du plus récent au plus ancien
  return Array.from(byKey.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ===========================================================================
// Métriques agrégées par workout
// ===========================================================================

export interface WorkoutMetrics {
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;  // somme des durées de sets en mode time
  maxWeight: number;
  uniqueExercises: number;
  avgRpe: number | null;
}

export function workoutMetrics(workout: GroupedWorkout): WorkoutMetrics {
  let totalVolume = 0;
  let totalReps = 0;
  let totalDurationSec = 0;
  let maxWeight = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  const exos = new Set<string>();

  for (const s of workout.sets) {
    totalVolume += s.weight * s.reps;
    totalReps += s.reps;
    totalDurationSec += s.duration || 0;
    if (s.weight > maxWeight) maxWeight = s.weight;
    if (s.exerciseName) exos.add(s.exerciseName);
    else exos.add(s.exerciseId);
    if (s.rpe != null) { rpeSum += s.rpe; rpeCount++; }
  }

  return {
    totalVolume: Math.round(totalVolume),
    totalSets: workout.sets.length,
    totalReps,
    totalDurationSec,
    maxWeight,
    uniqueExercises: exos.size,
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
  };
}

// ===========================================================================
// Delta entre 2 workouts basé sur les paires (exoName, setIndex) communes.
// Évite de pénaliser "moins de sets / moins de mini-séries myo-rep" alors que
// la charge a été maintenue ou augmentée.
//
// Pour chaque paire commune, ratio = metric(current) / metric(previous), où
// metric = weight×reps si > 0 sinon duration. Delta = moyenne(ratios) - 1.
// ===========================================================================

export function volumeDeltaPct(current: GroupedWorkout, previous: GroupedWorkout | undefined): number | null {
  if (!previous) return null;
  return matchedSeriesDeltaPct(current.sets, previous.sets);
}

// Generic helper — opère sur des listes de sets (pour réutilisation par-exo).
export function matchedSeriesDeltaPct(
  currentSets: WorkoutHistory[],
  previousSets: WorkoutHistory[],
): number | null {
  // Index la previous par clé exoName__setIndex
  const prevByKey = new Map<string, WorkoutHistory>();
  for (const p of previousSets) {
    if (p.setIndex == null) continue;
    const name = p.exerciseName || p.exerciseId;
    prevByKey.set(name + '__' + p.setIndex, p);
  }
  if (prevByKey.size === 0) return null;

  const ratios: number[] = [];
  for (const c of currentSets) {
    if (c.setIndex == null) continue;
    const name = c.exerciseName || c.exerciseId;
    const prev = prevByKey.get(name + '__' + c.setIndex);
    if (!prev) continue;

    const curVol = c.weight * c.reps;
    const prevVol = prev.weight * prev.reps;
    if (prevVol > 0 && curVol > 0) {
      ratios.push(curVol / prevVol);
      continue;
    }
    const curDur = c.duration || 0;
    const prevDur = prev.duration || 0;
    if (prevDur > 0 && curDur > 0) {
      ratios.push(curDur / prevDur);
    }
  }

  if (ratios.length === 0) return null;
  const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  return Math.round((avg - 1) * 100);
}

// ===========================================================================
// Trouve le workout précédent de la même séance (même programId+sessionId)
// ===========================================================================

export function findPreviousWorkout(
  workouts: GroupedWorkout[],
  currentId: string,
): GroupedWorkout | undefined {
  const idx = workouts.findIndex(w => w.id === currentId);
  if (idx < 0) return undefined;
  const current = workouts[idx];
  // workouts est trié desc → suivant = précédent dans le temps
  for (let i = idx + 1; i < workouts.length; i++) {
    if (workouts[i].programId === current.programId && workouts[i].sessionId === current.sessionId) {
      return workouts[i];
    }
  }
  return undefined;
}

// Comme findPreviousWorkout mais remonte jusqu'à la dernière séance dont les séries
// sont réellement comparables (matchedSeriesDeltaPct non-null), en sautant les fragments
// (séance interrompue/entrelacée) qui n'ont aucune série commune.
export function findPreviousComparable(
  workouts: GroupedWorkout[],
  currentId: string,
): { prev: GroupedWorkout | undefined; delta: number | null } {
  const idx = workouts.findIndex(w => w.id === currentId);
  if (idx < 0) return { prev: undefined, delta: null };
  const current = workouts[idx];
  let nearestSame: GroupedWorkout | undefined;
  for (let i = idx + 1; i < workouts.length; i++) {
    const w = workouts[i];
    if (w.programId !== current.programId || w.sessionId !== current.sessionId) continue;
    if (!nearestSame) nearestSame = w;
    const delta = matchedSeriesDeltaPct(current.sets, w.sets);
    if (delta !== null) return { prev: w, delta };
  }
  return { prev: nearestSame, delta: null };
}

// ===========================================================================
// Groupe les sets d un workout par exoName (clé stable) avec setIndex ordered
// ===========================================================================

export interface ExerciseInWorkout {
  exerciseName: string;
  exerciseId: string;
  setType?: string;
  mode: string;
  sets: WorkoutHistory[]; // tris par setIndex ASC puis completedAt ASC
}

export function exercisesInWorkout(workout: GroupedWorkout, programs: Program[]): ExerciseInWorkout[] {
  const byKey = new Map<string, ExerciseInWorkout>();
  for (const s of workout.sets) {
    const name = s.exerciseName || getExerciseName(programs, s.exerciseId);
    const key = name;
    if (!byKey.has(key)) {
      byKey.set(key, {
        exerciseName: name,
        exerciseId: s.exerciseId,
        setType: s.setType,
        mode: getExerciseMode(programs, s.exerciseId),
        sets: [],
      });
    }
    byKey.get(key)!.sets.push(s);
  }
  // Tri intra-exo par setIndex (1, 2, 3) puis date
  byKey.forEach(ex => {
    ex.sets.sort((a, b) => (a.setIndex || 0) - (b.setIndex || 0) || a.completedAt.localeCompare(b.completedAt));
  });
  return Array.from(byKey.values());
}
