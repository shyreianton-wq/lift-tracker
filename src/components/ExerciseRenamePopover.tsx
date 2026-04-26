import { useState, useRef, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { Program } from '@/types/workout';
import { getAllExerciseNames } from '@/lib/exercise-utils';

interface ExerciseRenamePopoverProps {
  currentName: string;
  occurrences: number;
  program: Program;
  onRename: (newName: string, propagate: boolean) => void;
}

export function ExerciseRenamePopover({
  currentName,
  occurrences,
  program,
  onRename,
}: ExerciseRenamePopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [propagate, setPropagate] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allNames = useMemo(() => getAllExerciseNames(program), [program]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return allNames.filter(n => n !== currentName);
    return allNames.filter(
      n => n !== currentName && n.toLowerCase().includes(q)
    );
  }, [name, allNames, currentName]);

  useEffect(() => {
    if (open) {
      setName('');
      setPropagate(true);
      setShowSuggestions(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitName(name);
  };

  const submitName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName) {
      setOpen(false);
      return;
    }
    onRename(trimmed, propagate);
    setOpen(false);
  };

  const selectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
    submitName(suggestion);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="rename-input" className="text-sm font-medium">
            Remplacer {currentName}
          </Label>
          <Input
            ref={inputRef}
            id="rename-input"
            value={name}
            onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="input-dark"
            placeholder="Nouveau nom..."
            autoComplete="off"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-secondary/30">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 transition-colors truncate"
                  onClick={() => selectSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {occurrences > 1 && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="propagate"
                checked={propagate}
                onCheckedChange={(checked) => setPropagate(checked === true)}
              />
              <Label htmlFor="propagate" className="text-sm text-muted-foreground cursor-pointer">
                Appliquer aux {occurrences} séances
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || name.trim() === currentName}
              className="btn-primary-gradient"
            >
              Renommer
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
