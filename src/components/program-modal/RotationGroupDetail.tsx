import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { RotationGroupConfig, RotationExercise } from '@/types/workout';
import { RotationExerciseCreator } from './RotationExerciseCreator';

interface Props {
  group: RotationGroupConfig;
  onSave: (group: RotationGroupConfig) => void;
  onCancel: () => void;
}

export function RotationGroupDetail({ group, onSave, onCancel }: Props) {
  const [name, setName] = useState(group.name);
  const [exercises, setExercises] = useState<RotationExercise[]>(group.exercises);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const addExercise = (ex: RotationExercise) => {
    setExercises([...exercises, ex]);
    setShowAddExercise(false);
  };

  const deleteExercise = (exId: string) => setExercises(exercises.filter(e => e.id !== exId));

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const arr = [...exercises];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setExercises(arr);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>← Retour</Button>
        <h3 className="font-semibold">Groupe de rotation</h3>
      </div>

      <div>
        <Label htmlFor="groupName">Nom du groupe</Label>
        <Input id="groupName" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Biceps, Triceps..." className="mt-1.5 input-dark" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Exercices du groupe ({exercises.length})</Label>
          <Button size="sm" variant="secondary" onClick={() => setShowAddExercise(true)}>
            <Plus className="h-4 w-4 mr-1" />Ajouter
          </Button>
        </div>

        {showAddExercise && (
          <RotationExerciseCreator
            onSave={addExercise}
            onCancel={() => setShowAddExercise(false)}
          />
        )}

        {exercises.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p className="text-sm">Ajoutez les variantes d'exercice qui vont alterner</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex, index) => (
              <div key={ex.id} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(index, 'up')} disabled={index === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(index, 'down')} disabled={index === exercises.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{ex.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{ex.sets.length} séries</span>
                    <span>•</span>
                    <span>{ex.mode === 'time' ? 'Temps' : ex.sets[0]?.type === 'myo-rep' ? 'Myo' : ex.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}</span>
                    {ex.sets[0] && (
                      <>
                        <span>•</span>
                        <span>
                          {ex.mode === 'time'
                            ? `${ex.sets[0].targetDuration}s`
                            : `${ex.sets[0].targetReps} reps`
                          } @ {ex.sets[0].targetWeight}kg
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteExercise(ex.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave({ ...group, name: name.trim(), exercises })}
          disabled={!name.trim()} className="btn-primary-gradient">
          Enregistrer le groupe
        </Button>
      </div>
    </div>
  );
}
