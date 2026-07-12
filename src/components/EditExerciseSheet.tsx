import { useEffect, useState } from 'react';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import { WorkoutHistory, SetType } from '@/types/workout';

type ExInWorkout = { exerciseName: string; exerciseId: string; mode: string; setType?: string; sets: WorkoutHistory[] };
type Row = { id?: string; setIndex: number; weight: number; reps: number; duration: number; setType: SetType };
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// Éditeur des séries d'UN exo dans une séance : modifier, supprimer, ajouter.
export function EditExerciseSheet({ ex, onClose, workout }: {
  ex: ExInWorkout | null; onClose: () => void;
  workout: { programId: string; sessionId: string; startedAt: string };
}) {
  const { updateHistoryEntry, deleteHistoryEntry, addHistoryEntries } = useWorkout();
  const [rows, setRows] = useState<Row[]>([]);
  const mode = ex?.mode === 'time' ? 'time' : 'reps';

  useEffect(() => {
    if (!ex) { setRows([]); return; }
    setRows(ex.sets.slice().sort((a, b) => (a.setIndex || 0) - (b.setIndex || 0)).map((s, i) => ({
      id: s.id, setIndex: s.setIndex || i + 1, weight: s.weight || 0, reps: s.reps || 0,
      duration: s.duration || 0, setType: (s.setType as SetType) || 'force',
    })));
  }, [ex]);

  if (!ex) return null;

  const addRow = () => setRows(r => {
    const last = r[r.length - 1];
    return [...r, { setIndex: r.length + 1, weight: last?.weight || 0, reps: last?.reps || 0, duration: last?.duration || 0, setType: last?.setType || (ex.setType as SetType) || 'force' }];
  });
  const upd = (i: number, patch: Partial<Row>) => setRows(r => r.map((x, k) => k === i ? { ...x, ...patch } : x));
  const del = (i: number) => setRows(r => r.filter((_, k) => k !== i).map((x, k) => ({ ...x, setIndex: k + 1 })));

  const save = () => {
    const kept = new Set(rows.filter(r => r.id).map(r => r.id as string));
    for (const s of ex.sets) if (!kept.has(s.id)) deleteHistoryEntry(s.id);
    const base = new Date(ex.sets[0]?.completedAt || workout.startedAt).getTime();
    const adds: WorkoutHistory[] = [];
    rows.forEach((r, i) => {
      const val = mode === 'time'
        ? { reps: 0, weight: 0, duration: r.duration || 0 }
        : { reps: r.reps || 0, weight: r.weight || 0, duration: undefined };
      if (r.id) {
        updateHistoryEntry(r.id, { ...val, setType: r.setType, setIndex: r.setIndex });
      } else {
        adds.push({
          id: rid() + '-' + i,
          programId: ex.sets[0]?.programId || workout.programId,
          sessionId: ex.sets[0]?.sessionId || workout.sessionId,
          exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, setId: rid() + '-s' + i,
          ...val, setType: r.setType,
          completedAt: new Date(base + (900 + i) * 1000).toISOString(), setIndex: r.setIndex,
        });
      }
    });
    if (adds.length) addHistoryEntries(adds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{ex.exerciseName}</h2>
            <p className="text-xs text-muted-foreground">Modifier / supprimer / ajouter des séries</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rows.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Aucune série (ajoute-en une).</div>}
          {rows.map((r, i) => (
            <div key={r.id || 'new' + i} className="flex items-center gap-2">
              <span className="text-xs font-bold w-7 text-center text-muted-foreground shrink-0">S{r.setIndex}</span>
              {mode === 'time' ? (
                <div className="flex items-center gap-1 flex-1">
                  <input type="number" inputMode="numeric" value={r.duration} onChange={e => upd(i, { duration: +e.target.value })} className="w-full rounded-lg h-9 px-2 bg-secondary tabular-nums text-sm" />
                  <span className="text-xs text-muted-foreground">s</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" inputMode="decimal" value={r.weight} onChange={e => upd(i, { weight: +e.target.value })} className="w-full rounded-lg h-9 px-2 bg-secondary tabular-nums text-sm" />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  <span className="text-muted-foreground text-sm">×</span>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" inputMode="numeric" value={r.reps} onChange={e => upd(i, { reps: +e.target.value })} className="w-full rounded-lg h-9 px-2 bg-secondary tabular-nums text-sm" />
                    <span className="text-xs text-muted-foreground">reps</span>
                  </div>
                </>
              )}
              <button type="button" onClick={() => del(i)} className="text-muted-foreground hover:text-destructive shrink-0" title="Supprimer cette série"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addRow} className="text-muted-foreground"><Plus className="h-4 w-4 mr-1" /> série</Button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button className="btn-primary-gradient" onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
