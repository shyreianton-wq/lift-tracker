import { useEffect, useState } from 'react';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import { Program, Session, WorkoutHistory, SetType, ExerciseMode } from '@/types/workout';

type Row = { setIndex: number; weight: number; reps: number; duration: number; setType: SetType };
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// Saisie MANUELLE de séries ajoutées à une séance existante (rattrapage si le save
// et le localStorage n'ont rien gardé). Additif : union par id côté hook.
export function AddSetsSheet({ open, onClose, program: _program, session, workout }: {
  open: boolean; onClose: () => void;
  program: Program | undefined; session: Session | undefined;
  workout: { programId: string; sessionId: string; startedAt: string };
}) {
  const { addHistoryEntries } = useWorkout();
  const exercises = session?.exercises || [];
  const [exName, setExName] = useState('');
  const [freeText, setFreeText] = useState('');
  const [mode, setMode] = useState<ExerciseMode>('reps');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (open) { setExName(''); setFreeText(''); setMode('reps'); setRows([]); }
  }, [open]);

  if (!open) return null;

  const pickExercise = (name: string) => {
    setExName(name);
    const ex = exercises.find(e => e.name === name);
    if (ex) {
      setMode(ex.mode);
      setRows(ex.sets.map((s, i) => ({ setIndex: i + 1, weight: s.targetWeight || 0, reps: s.targetReps || 0, duration: s.targetDuration || 0, setType: s.type })));
    } else {
      setMode('reps');
      setRows([{ setIndex: 1, weight: 0, reps: 0, duration: 0, setType: 'force' }]);
    }
  };

  const name = exName === '__free__' ? freeText.trim() : exName;
  const addRow = () => setRows(r => {
    const last = r[r.length - 1];
    return [...r, { setIndex: r.length + 1, weight: last?.weight || 0, reps: last?.reps || 0, duration: last?.duration || 0, setType: last?.setType || 'force' }];
  });
  const upd = (i: number, patch: Partial<Row>) => setRows(r => r.map((x, k) => k === i ? { ...x, ...patch } : x));
  const del = (i: number) => setRows(r => r.filter((_, k) => k !== i).map((x, k) => ({ ...x, setIndex: k + 1 })));

  const submit = () => {
    if (!name || rows.length === 0) return;
    const base = new Date(workout.startedAt).getTime();
    const ex = exercises.find(e => e.name === name);
    const entries: WorkoutHistory[] = rows.map((r, i) => ({
      id: rid() + '-' + i,
      programId: workout.programId,
      sessionId: workout.sessionId,
      exerciseId: ex?.id || ('manual-' + name),
      exerciseName: name,
      setId: rid() + '-s' + i,
      reps: mode === 'time' ? 0 : (r.reps || 0),
      weight: mode === 'time' ? 0 : (r.weight || 0),
      duration: mode === 'time' ? (r.duration || 0) : undefined,
      setType: r.setType,
      completedAt: new Date(base + i * 1000).toISOString(),
      setIndex: r.setIndex,
    }));
    addHistoryEntries(entries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Ajouter des séries</h2>
            <p className="text-xs text-muted-foreground">Saisie manuelle — ajoutées à cette séance</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Exercice</label>
            <select value={exName} onChange={e => pickExercise(e.target.value)} className="mt-1 w-full rounded-lg h-10 px-3 bg-secondary text-sm">
              <option value="">— choisir —</option>
              {exercises.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              <option value="__free__">Autre (saisir un nom)…</option>
            </select>
            {exName === '__free__' && (
              <input value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="Nom de l'exercice"
                className="mt-2 w-full rounded-lg h-10 px-3 bg-secondary text-sm" />
            )}
            {exName === '__free__' && name && (
              <div className="flex gap-2 text-xs mt-2">
                <button type="button" onClick={() => setMode('reps')} className={`px-2 py-1 rounded ${mode === 'reps' ? 'bg-primary text-white' : 'bg-secondary'}`}>Reps</button>
                <button type="button" onClick={() => setMode('time')} className={`px-2 py-1 rounded ${mode === 'time' ? 'bg-primary text-white' : 'bg-secondary'}`}>Temps</button>
              </div>
            )}
          </div>

          {name && (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
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
                  <button type="button" onClick={() => del(i)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addRow} className="text-muted-foreground"><Plus className="h-4 w-4 mr-1" /> série</Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button className="btn-primary-gradient" onClick={submit} disabled={!name || rows.length === 0}>
            Ajouter {rows.length} série{rows.length > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
