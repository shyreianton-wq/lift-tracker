import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { CloudUpload } from 'lucide-react';

// Popup au chargement si des séries hors-ligne (localStorage) manquent au serveur.
// L'utilisateur décide de synchroniser (additif : union, jamais d'écrasement serveur).
export function PendingSyncPrompt() {
  const { pendingSync, syncPending, dismissPending } = useWorkout();
  if (!pendingSync || pendingSync.length === 0) return null;
  const n = pendingSync.length;
  return (
    <div className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-2">
          <CloudUpload className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Séries non synchronisées</h3>
        </div>
        <p className="text-muted-foreground mb-6 text-sm">
          {n} série{n > 1 ? 's' : ''} d'une séance précédente {n > 1 ? "n'ont" : "n'a"} pas été enregistrée{n > 1 ? 's' : ''} sur le serveur (connexion perdue). Les synchroniser maintenant ?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={dismissPending}>Plus tard</Button>
          <Button className="flex-1 btn-primary-gradient" onClick={() => syncPending(pendingSync)}>Synchroniser</Button>
        </div>
      </div>
    </div>
  );
}
