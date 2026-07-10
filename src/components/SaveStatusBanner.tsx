import { useWorkout } from '@/contexts/WorkoutContext';
import { AlertTriangle } from 'lucide-react';

// Bandeau global : reste affiché tant qu'une sauvegarde échoue (serveur injoignable,
// VPN coupé, erreur HTTP). Objectif : ne plus perdre une séance sans le savoir.
export function SaveStatusBanner() {
  const { saveState } = useWorkout();
  if (saveState !== 'error') return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[200] bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Sauvegarde impossible — ta séance n'est peut-être pas enregistrée. Vérifie ta connexion.</span>
    </div>
  );
}
