import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface RenameOrReplaceDialogProps {
  open: boolean;
  oldName: string;
  newName: string;
  // Number of history entries currently logged under oldName (for context).
  historyEntries?: number;
  onRename: () => void;       // user chose "renommage" → migrate history
  onReplace: () => void;      // user chose "remplacement" → keep history as-is
  onCancel: () => void;       // dismiss without changing anything
}

// Asked when the user changes an exercise name to a value that does NOT exist
// anywhere in the history nor in any program. Two semantics are possible:
//   - Rename: keep the past performance series, just under the new label.
//   - Replace: start a fresh series under the new label; the old name keeps
//              its own history (e.g. swapped for a different movement).
// If the new name already exists in history/programs, this dialog is NOT
// shown — it's unambiguously a replacement towards a known exercise.
export function RenameOrReplaceDialog({
  open,
  oldName,
  newName,
  historyEntries,
  onRename,
  onReplace,
  onCancel,
}: RenameOrReplaceDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              Renommage ou remplacement&nbsp;?
            </h3>
            <p className="text-muted-foreground mb-1 text-sm">
              <span className="font-medium text-foreground">{oldName}</span>
              <span className="mx-1">→</span>
              <span className="font-medium text-foreground">{newName}</span>
            </p>
            <p className="text-muted-foreground mb-5 text-sm">
              {typeof historyEntries === 'number' && historyEntries > 0
                ? `${historyEntries} performance${historyEntries > 1 ? 's' : ''} existe${historyEntries > 1 ? 'nt' : ''} sous l'ancien nom.`
                : "L'historique sera affecté selon ton choix."}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onRename}
                className="w-full text-left p-3 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="font-medium text-foreground text-sm">
                  C'est un renommage
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Garder l'historique de {oldName} sous le nouveau nom.
                </div>
              </button>

              <button
                type="button"
                onClick={onReplace}
                className="w-full text-left p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="font-medium text-foreground text-sm">
                  C'est un remplacement
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Repartir à zéro&nbsp;; l'historique reste sur {oldName}.
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
