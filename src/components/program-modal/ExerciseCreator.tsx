import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Timer } from 'lucide-react';
import { Exercise, ExerciseMode, SetType, WorkoutSet } from '@/types/workout';
import { generateId } from './programModalUtils';

interface Props {
  onSave: (ex: Exercise) => void;
  onCancel: () => void;
  existingNames?: string[];
}

export function ExerciseCreator({ onSave, onCancel, existingNames = [] }: Props) {
  const [name, setName] = useState('');
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('reps');
  const [setType, setSetType] = useState<SetType>('force');
  const [numSets, setNumSets] = useState(3);
  const [targetReps, setTargetReps] = useState(10);
  const [targetWeight, setTargetWeight] = useState(20);
  const [targetDuration, setTargetDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = name.trim().length > 0
    ? existingNames.filter(n => n.toLowerCase().includes(name.toLowerCase()) && n.toLowerCase() !== name.toLowerCase())
    : existingNames;

  const handleSave = () => {
    if (!name.trim()) return;
    const sets: WorkoutSet[] = Array.from({ length: numSets }, () => ({
      id: generateId(), type: setType, targetReps: exerciseMode === 'reps' ? targetReps : 0,
      targetWeight, targetDuration: exerciseMode === 'time' ? targetDuration : undefined, isCompleted: false,
    }));
    onSave({ id: generateId(), name: name.trim(), sets, mode: exerciseMode, notes: notes.trim() || undefined });
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-secondary/30 rounded-xl border border-border mb-4 space-y-4"
    >
      <div className="relative">
        <Label>Nom de l'exercice</Label>
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Ex: Développé couché"
          className="mt-1.5 input-dark"
          autoComplete="off"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
            {filteredSuggestions.slice(0, 8).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors text-foreground"
                onClick={() => { setName(suggestion); setShowSuggestions(false); }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Mode</Label>
          <div className="flex gap-2 mt-1.5">
            <Button type="button" variant={exerciseMode === 'reps' ? 'default' : 'secondary'} size="sm"
              onClick={() => setExerciseMode('reps')} className={exerciseMode === 'reps' ? 'btn-primary-gradient' : ''}>
              <Dumbbell className="h-3 w-3 mr-1" />Reps</Button>
            <Button type="button" variant={exerciseMode === 'time' ? 'default' : 'secondary'} size="sm"
              onClick={() => setExerciseMode('time')} className={exerciseMode === 'time' ? 'btn-primary-gradient' : ''}>
              <Timer className="h-3 w-3 mr-1" />Temps</Button>
          </div>
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1.5">
            <Button type="button" variant={setType === 'force' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('force'); setNumSets(3); }} className={setType === 'force' ? 'btn-primary-gradient' : ''}>Force</Button>
            <Button type="button" variant={setType === 'hypertrophie' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('hypertrophie'); setNumSets(3); }} className={setType === 'hypertrophie' ? 'btn-primary-gradient' : ''}>Hyp</Button>
            <Button type="button" variant={setType === 'myo-rep' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('myo-rep'); setNumSets(2); }} className={setType === 'myo-rep' ? 'btn-primary-gradient' : ''}>Myo</Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Séries</Label><Input type="number" value={numSets} onChange={(e) => setNumSets(parseInt(e.target.value) || 1)} min={1} max={10} className="mt-1.5 input-dark" /></div>
        {exerciseMode === 'reps'
          ? <div><Label>Reps</Label><Input type="number" value={targetReps} onChange={(e) => setTargetReps(parseInt(e.target.value) || 1)} min={1} className="mt-1.5 input-dark" /></div>
          : <div><Label>Durée (s)</Label><Input type="number" value={targetDuration} onChange={(e) => setTargetDuration(parseInt(e.target.value) || 10)} min={1} className="mt-1.5 input-dark" /></div>
        }
        <div><Label>Poids (kg)</Label><Input type="number" step="0.5" value={targetWeight} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)} min={0} className="mt-1.5 input-dark" /></div>
      </div>
      <div><Label>Notes (optionnel)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Tempo 3-1-1" className="mt-1.5 input-dark" /></div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()} className="btn-primary-gradient">Ajouter</Button>
      </div>
    </motion.div>
  );
}
