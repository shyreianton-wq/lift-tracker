import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
  allExerciseNames: string[];
  currentName?: string;
}

export function ExercisePicker({ open, onClose, onSelect, allExerciseNames, currentName }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allExerciseNames;
    return allExerciseNames.filter(n => n.toLowerCase().includes(q));
  }, [query, allExerciseNames]);

  const showCustom = query.trim().length > 0 && !allExerciseNames.some(n => n.toLowerCase() === query.trim().toLowerCase());

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Choisir un exercice</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Rechercher ou créer..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-10 input-dark"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2">
            {showCustom && (
              <button
                onClick={() => { onSelect(query.trim()); onClose(); }}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors mb-1"
              >
                <span className="text-sm font-medium text-primary">+ Créer « {query.trim()} »</span>
              </button>
            )}
            {filtered.map(name => (
              <button
                key={name}
                onClick={() => { onSelect(name); onClose(); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors ${
                  name === currentName ? 'bg-secondary/30 text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                <span className="text-sm">{name}</span>
              </button>
            ))}
            {filtered.length === 0 && !showCustom && (
              <p className="text-center text-sm text-muted-foreground py-6">Aucun exercice trouvé</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
