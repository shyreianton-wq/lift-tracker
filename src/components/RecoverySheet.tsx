import { useEffect, useMemo, useState } from 'react';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { X, CloudUpload, Trash2 } from 'lucide-react';
import { WorkoutHistory, Program } from '@/types/workout';

function sessionLabel(programs: Program[], programId: string, sessionId: string) {
  const s = programs.find(p => p.id === programId)?.sessions.find(x => x.id === sessionId);
  return s?.name || 'Séance';
}
function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Coffre de récupération : lit le tampon localStorage UNIQUEMENT quand on l'ouvre.
// L'app ne lit jamais ce tampon automatiquement. Ici tu coches les séries à renvoyer.
export function RecoverySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getLocalBackup, pushLocalEntries, clearLocalBackup, history, programs } = useWorkout();
  const [backup, setBackup] = useState<WorkoutHistory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const serverIds = useMemo(() => new Set(history.map(h => h.id)), [history]);

  useEffect(() => {
    if (!open) return;
    const b = getLocalBackup().slice().sort((a, c) => (c.completedAt || '').localeCompare(a.completedAt || ''));
    setBackup(b);
    setSelected(new Set(b.filter(e => !serverIds.has(e.id)).map(e => e.id))); // pré-coche ce qui manque au serveur
  }, [open, getLocalBackup, serverIds]);

  if (!open) return null;

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const doPush = () => { pushLocalEntries(backup.filter(e => selected.has(e.id))); onClose(); };
  const doClear = () => { if (window.confirm('Vider tout le tampon local ? Les séries non poussées seront perdues.')) { clearLocalBackup(); onClose(); } };

  return (
    <div className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Rattraper une séance</h2>
            <p className="text-xs text-muted-foreground">Séries restées dans le tampon local (non envoyées au serveur)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {backup.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Le tampon local est vide.</div>
          ) : backup.map(e => {
            const onServer = serverIds.has(e.id);
            const val = e.duration ? `${e.duration}s` : `${e.weight}×${e.reps}`;
            return (
              <label key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${onServer ? 'opacity-50' : 'bg-secondary/40'}`}>
                <input type="checkbox" disabled={onServer} checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {sessionLabel(programs, e.programId, e.sessionId)} · {e.exerciseName} S{e.setIndex ?? '?'}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {fmt(e.completedAt)} · {val}{onServer ? ' · déjà sur le serveur' : ''}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={doClear} disabled={backup.length === 0}>
            <Trash2 className="h-4 w-4 mr-1" /> Vider
          </Button>
          <Button className="btn-primary-gradient" onClick={doPush} disabled={selected.size === 0}>
            <CloudUpload className="h-4 w-4 mr-1" /> Pousser {selected.size} série{selected.size > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
