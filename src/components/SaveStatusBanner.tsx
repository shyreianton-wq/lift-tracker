import { useWorkout } from '@/contexts/WorkoutContext';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

// Bandeau global tant qu'une sauvegarde échoue. Permet de se reconnecter SANS
// recharger la page (donc sans perdre l'avancement) : bouton Réessayer + Reconnecter
// (ouvre un onglet pour repasser l'auth SAML, puis l'essai auto/manuel repasse).
export function SaveStatusBanner() {
  const { saveState, retrySave } = useWorkout();
  if (saveState !== 'error') return null;
  const reconnect = () => { try { window.open(window.location.origin, '_blank', 'noopener,noreferrer'); } catch { /* ignore */ } };
  return (
    <div className="fixed top-0 inset-x-0 z-[200] bg-destructive text-destructive-foreground px-3 py-2 shadow-lg">
      <div className="flex items-center justify-center gap-2 flex-wrap max-w-2xl mx-auto text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">Sauvegarde impossible — connexion perdue.</span>
        <button onClick={retrySave} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> Réessayer
        </button>
        <button onClick={reconnect} title="Ouvre un onglet pour te reconnecter (SAML), puis reviens ici" className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-semibold">
          <LogIn className="h-3.5 w-3.5" /> Reconnecter
        </button>
      </div>
      <div className="text-center text-[11px] opacity-80 mt-0.5">Ta séance n'est pas perdue — resync auto dès que la connexion revient (essai toutes les 20 s).</div>
    </div>
  );
}
