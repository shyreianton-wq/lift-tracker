import { useEffect, useMemo, useState } from 'react';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import { Program, Session, WorkoutHistory, WorkoutSet, SetType, ExerciseMode } from '@/types/workout';

type Row = { setIndex: number; weight: number; reps: number; duration: number; setType: SetType };
type Opt = { name: string; id: string; mode: ExerciseMode; sets: WorkoutSet[] };
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// Saisie MANUELLE de séries ajoutées à une séance existante (rattrapage).
// Les SLOTS de rotation sont éclatés en leurs exos réels (Curl Haltères / Marteau…) au choix,
// pour que les séries soient stockées sous le vrai nom d'exo (et donc reconnues).
export function AddSetsSheet({ open, onClose, program, session, workout }: {
  open: boolean; onClose: () => void;
  program: Program | undefined; session: Session | undefined;
  workout: { programId: string; sessionId: string; startedAt: string };
}) {
  const { addHistoryEntries } = useWorkout();

  const options = useMemo<Opt[]>(() => {
    const out: Opt[] = [];
    const seen = new Set<string>();
    const push = (o: Opt) => { if (o.name && !seen.has(o.name)) { seen.add(o.name); out.push(o); } };
    for (const ex of session?.exercises || []) {
      if (ex.rotationGroupRef) {
        const grp = program?.rotationGroups?.find(g => g.id === ex.rotationGroupRef);
        if (grp) { for (const ge of grp.exercises) push({ name: ge.name, id: ge.id, mode: ge.mode, sets: ge.sets }); continue; }
      }
      push({ name: ex.name, id: ex.id, mode: ex.mode, sets: ex.sets });
    }
    return out;
  }, [session, program]);

  const [sel, setSel] = useState('');
  const [freeText, setFreeText] = useState('');
  const [mode, setMode] = useState<ExerciseMode>('reps');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { if (open) { setSel(''); setFreeText(''); setMode('reps'); setRows([]); } }, [open]);

  if (!open) return null;

  const pick = (value: string) => {
    setSel(value);
    if (value === '') { setRows([]); setMode('reps'); return; }
    if (value === '__free__') { setMode('reps'); setRows([{ setIndex: 1, weight: 0, reps: 0, duration: 0, setType: 'force' }]); return; }
    const o = options.find(x => x.name === value);
    if (o) {
      setMode(o.mode);
      setRows(o.sets.map((s, i) => ({ setIndex: i + 1, weight: s.targetWeight || 0, reps: s.targetReps || 0, duration: s.targetDuration || 0, setType: s.type })));
    }
  };

  const name = sel === '__free__' ? freeText.trim() : sel;
  const chosen = options.find(o => o.name === name);
  const addRow = () => setRows(r => { const l = r[r.length - 1]; return [...r, { setIndex: r.length + 1, weight: l?.weight || 0, reps: l?.reps || 0, duration: l?.duration || 0, setType: l?.setType || 'force' }]; });
  const upd = (i: number, p: Partial<Row>) => setRows(r => r.map((x, k) => k === i ? { ...x, ...p } : x));
  const del = (i: number) => setRows(r => r.filter((_, k) => k !== i).map((x, k) => ({ ...x, setIndex: k + 1 })));

  const submit = () => {
    if (!name || rows.length === 0) return;
    const base = new Date(workout.startedAt).getTime();
    const entries: WorkoutHistory[] = rows.map((r, i) => ({
      id: rid() + '-' + i, programId: workout.programId, sessionId: workout.sessionId,
      exerciseId: chosen?.id || ('manual-' + name), exerciseName: name, setId: rid() + '-s' + i,
      reps: mode === 'time' ? 0 : (r.reps || 0), weight: mode === 'time' ? 0 : (r.weight || 0),
      duration: mode === 'time' ? (r.duration || 0) : undefined, setType: r.setType,
      completedAt: new Date(base + i * 1000).toISOString(), setIndex: r.setIndex,
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
            <select value={sel} onChange={e => pick(e.target.value)} className="mt-1 w-full rounded-lg h-10 px-3 bg-secondary text-sm">
              <option value="">— choisir —</option>
              {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              <option value="__free__">Autre (saisir un nom)…</option>
            </select>
            {sel === '__free__' && (
              <input value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="Nom de l'exercice"
                className="mt-2 w-full rounded-lg h-10 px-3 bg-secondary text-sm" />
            )}
            {sel === '__free__' && name && (
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
