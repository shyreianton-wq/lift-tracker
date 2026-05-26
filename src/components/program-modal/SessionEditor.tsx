import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Timer, Dumbbell,
  RotateCcw, Shuffle, Pencil, Check, Zap,
} from 'lucide-react';
import {
  Session, Exercise, ExerciseMode, SetType,
  RotationGroupConfig,
} from '@/types/workout';
import { generateId } from './programModalUtils';
import { ExerciseCreator } from './ExerciseCreator';
import { useWorkout } from '@/contexts/WorkoutContext';
import { isExerciseNameKnown, hasHistoryForExerciseName } from '@/lib/exercise-utils';
import { RenameOrReplaceDialog } from '../RenameOrReplaceDialog';

interface Props {
  session: Session;
  onSave: (session: Session) => void;
  onCancel: () => void;
  rotationGroups: RotationGroupConfig[];
  allSessions: Session[];
  onRenameGlobal?: (oldName: string, newName: string) => void;
  historyExerciseNames?: string[];
}

export function SessionEditor({
  session, onSave, onCancel,
  rotationGroups, allSessions, onRenameGlobal,
  historyExerciseNames = [],
}: Props) {
  const { history, programs, migrateHistoryExerciseName } = useWorkout();

  const [name, setName] = useState(session.name);
  const [sessionType, setSessionType] = useState<'force' | 'hypertrophie' | 'myo-rep' | undefined>(session.type);
  const [exercises, setExercises] = useState<Exercise[]>(session.exercises);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseNewName, setEditingExerciseNewName] = useState('');
  const [supersetPairingId, setSupersetPairingId] = useState<string | null>(null);

  // Pending rename intent: when the new name doesn't exist anywhere, we
  // surface the rename/replacement dialog and stash the rename here until
  // the user picks a semantic.
  const [pendingRename, setPendingRename] = useState<{
    exerciseId: string;
    oldName: string;
    newName: string;
  } | null>(null);

  const handleSave = () => onSave({ ...session, name, type: sessionType, exercises });

  // Apply the rename to the local session state + propagate globally.
  // Does NOT migrate history — callers decide that via the dialog.
  const applyRename = (exerciseId: string, oldName: string, newName: string) => {
    setExercises(prev => prev.map(e => e.name === oldName ? { ...e, name: newName } : e));
    if (onRenameGlobal && oldName !== newName) {
      onRenameGlobal(oldName, newName);
    }
    setEditingExerciseId(null);
    setEditingExerciseNewName('');
  };

  const renameExercise = (exerciseId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldExercise = exercises.find(e => e.id === exerciseId);
    if (!oldExercise) return;
    const oldName = oldExercise.name;
    if (trimmed === oldName) {
      setEditingExerciseId(null);
      setEditingExerciseNewName('');
      return;
    }

    // If the new name is already known (history or another program/group),
    // it's unambiguously a replacement: no dialog, no history migration.
    if (isExerciseNameKnown(history, programs, trimmed)) {
      applyRename(exerciseId, oldName, trimmed);
      return;
    }

    // Unknown new name → only ask if the OLD name actually has history to
    // migrate. Otherwise just apply the rename silently.
    if (!hasHistoryForExerciseName(history, oldName)) {
      applyRename(exerciseId, oldName, trimmed);
      return;
    }

    setPendingRename({ exerciseId, oldName, newName: trimmed });
  };

  const confirmRenameAsRename = () => {
    if (!pendingRename) return;
    const { exerciseId, oldName, newName } = pendingRename;
    migrateHistoryExerciseName(oldName, newName);
    applyRename(exerciseId, oldName, newName);
    setPendingRename(null);
  };

  const confirmRenameAsReplacement = () => {
    if (!pendingRename) return;
    const { exerciseId, oldName, newName } = pendingRename;
    applyRename(exerciseId, oldName, newName);
    setPendingRename(null);
  };

  const pendingRenameHistoryCount = useMemo(() => {
    if (!pendingRename) return 0;
    return history.filter(h => h.exerciseName === pendingRename.oldName).length;
  }, [history, pendingRename]);

  const addExercise = (exercise: Exercise) => { setExercises([...exercises, exercise]); setShowAddExercise(false); };

  const deleteExercise = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    // If deleting a superset member, unpair its partner
    if (ex?.supersetPairId) {
      setExercises(exercises.filter(e => e.id !== id).map(e => e.supersetPairId === ex.supersetPairId ? { ...e, supersetPairId: undefined } : e));
    } else {
      setExercises(exercises.filter(e => e.id !== id));
    }
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const arr = [...exercises];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setExercises(arr);
  };

  const toggleExerciseMode = (id: string) => {
    setExercises(exercises.map(e => e.id !== id ? e : { ...e, mode: e.mode === 'time' ? 'reps' as ExerciseMode : 'time' as ExerciseMode }));
  };

  const toggleSetType = (id: string) => {
    setExercises(exercises.map(e => {
      if (e.id !== id) return e;
      const currentType = e.sets[0]?.type || 'force';
      const newType: SetType = currentType === 'force' ? 'hypertrophie' : currentType === 'hypertrophie' ? 'myo-rep' : 'force';
      const newNumSets = newType === 'myo-rep' ? 2 : newType === 'hypertrophie' ? 3 : 3;
      let newSets = e.sets.map(s => ({ ...s, type: newType }));
      if (newSets.length > newNumSets) {
        newSets = newSets.slice(0, newNumSets);
      } else {
        const template = newSets[newSets.length - 1] || newSets[0];
        while (newSets.length < newNumSets) {
          newSets.push({ ...template, id: generateId(), isCompleted: false });
        }
      }
      return { ...e, sets: newSets };
    }));
  };

  const updateSetCount = (id: string, delta: number) => {
    setExercises(exercises.map(e => {
      if (e.id !== id) return e;
      const newCount = Math.max(1, Math.min(10, e.sets.length + delta));
      if (newCount === e.sets.length) return e;
      let newSets = [...e.sets];
      if (newCount > e.sets.length) {
        const template = e.sets[e.sets.length - 1] || e.sets[0];
        while (newSets.length < newCount) {
          newSets.push({ ...template, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, isCompleted: false, completedReps: undefined, completedWeight: undefined, completedDuration: undefined, rpe: undefined });
        }
      } else {
        newSets = newSets.slice(0, newCount);
      }
      return { ...e, sets: newSets };
    }));
  };

  const addRotationSlot = (groupId: string) => {
    const group = rotationGroups.find(g => g.id === groupId);
    if (!group) return;
    const slotExercise: Exercise = {
      id: generateId(),
      name: `🔄 ${group.name}`,
      sets: group.exercises[0]?.sets || [{ id: generateId(), type: 'force', targetReps: 10, targetWeight: 20, isCompleted: false }],
      mode: group.exercises[0]?.mode || 'reps',
      rotationGroupRef: group.id,
    };
    setExercises([...exercises, slotExercise]);
    setShowAddSlot(false);
  };

  const handleSupersetToggle = (exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise || exercise.rotationGroupRef) return;

    // If already in a superset, unpair
    if (exercise.supersetPairId) {
      const pairId = exercise.supersetPairId;
      setExercises(exercises.map(e => e.supersetPairId === pairId ? { ...e, supersetPairId: undefined } : e));
      setSupersetPairingId(null);
      return;
    }

    // If we are in pairing mode and clicking a different exercise
    if (supersetPairingId && supersetPairingId !== exerciseId) {
      const newPairId = `ss-${Date.now()}`;
      const firstIdx = exercises.findIndex(e => e.id === supersetPairingId);
      const secondIdx = exercises.findIndex(e => e.id === exerciseId);
      if (firstIdx >= 0 && secondIdx >= 0) {
        let newExercises = [...exercises];
        // Remove the second from its position
        const [moved] = newExercises.splice(secondIdx, 1);
        // Insert right after the first (recalculate index after splice)
        const newFirstIdx = newExercises.findIndex(e => e.id === supersetPairingId);
        newExercises.splice(newFirstIdx + 1, 0, moved);
        // Set pair ids
        newExercises = newExercises.map(e =>
          e.id === supersetPairingId || e.id === exerciseId
            ? { ...e, supersetPairId: newPairId }
            : e
        );
        setExercises(newExercises);
      }
      setSupersetPairingId(null);
      return;
    }

    // Enter pairing mode or cancel
    if (supersetPairingId === exerciseId) {
      setSupersetPairingId(null);
    } else {
      setSupersetPairingId(exerciseId);
    }
  };

  // Collect all exercise names across ALL sessions for autocomplete
  const allExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of allSessions) {
      for (const e of s.exercises) {
        if (e.name && !e.rotationGroupRef) names.add(e.name);
      }
    }
    for (const e of exercises) {
      if (e.name && !e.rotationGroupRef) names.add(e.name);
    }
    for (const g of rotationGroups) {
      for (const e of g.exercises) {
        names.add(e.name);
      }
    }
    for (const n of historyExerciseNames) names.add(n);
    return Array.from(names).sort();
  }, [exercises, rotationGroups, allSessions, historyExerciseNames]);

  const usedGroupIds = new Set(exercises.filter(e => e.rotationGroupRef).map(e => e.rotationGroupRef!));
  const availableGroups = rotationGroups.filter(g => !usedGroupIds.has(g.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>← Retour</Button>
        <h3 className="font-semibold">Modifier la séance</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Push Day" className="mt-1.5 input-dark" />
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1.5">
            <Button type="button" variant={sessionType === 'force' ? 'default' : 'secondary'} size="sm"
              onClick={() => setSessionType('force')} className={sessionType === 'force' ? 'btn-primary-gradient' : ''}>Force</Button>
            <Button type="button" variant={sessionType === 'hypertrophie' ? 'default' : 'secondary'} size="sm"
              onClick={() => setSessionType('hypertrophie')} className={sessionType === 'hypertrophie' ? 'btn-primary-gradient' : ''}>Hyp</Button>
            <Button type="button" variant={sessionType === 'myo-rep' ? 'default' : 'secondary'} size="sm"
              onClick={() => setSessionType('myo-rep')} className={sessionType === 'myo-rep' ? 'btn-primary-gradient' : ''}>Myo</Button>
          </div>
        </div>
      </div>

      {/* Superset pairing mode banner */}
      {supersetPairingId && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2"
        >
          <Zap className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-purple-300">Cliquez sur un autre exercice pour créer un superset</span>
          <button type="button" onClick={() => setSupersetPairingId(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Annuler</button>
        </motion.div>
      )}

      <datalist id="exercise-names-datalist">
        {allExerciseNames.map(n => <option key={n} value={n} />)}
      </datalist>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Exercices ({exercises.length})</Label>
          <div className="flex gap-2">
            {availableGroups.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShowAddSlot(!showAddSlot)}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                <Shuffle className="h-4 w-4 mr-1" />Rotation
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setShowAddExercise(true)}>
              <Plus className="h-4 w-4 mr-1" />Exercice
            </Button>
          </div>
        </div>

        {showAddSlot && availableGroups.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl mb-3 space-y-2"
          >
            <p className="text-xs text-muted-foreground">Choisir un groupe de rotation à ajouter :</p>
            <div className="flex flex-wrap gap-2">
              {availableGroups.map(g => (
                <Button key={g.id} size="sm" variant="secondary" onClick={() => addRotationSlot(g.id)}
                  className="border-purple-500/20 hover:bg-purple-500/10">
                  <Shuffle className="h-3 w-3 mr-1 text-purple-400" />
                  {g.name} ({g.exercises.length} exos)
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {showAddExercise && (
          <ExerciseCreator onSave={addExercise} onCancel={() => setShowAddExercise(false)} existingNames={allExerciseNames} />
        )}

        {exercises.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p>Aucun exercice</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, index) => {
              const isSlot = !!exercise.rotationGroupRef;
              const slotGroup = isSlot ? rotationGroups.find(g => g.id === exercise.rotationGroupRef) : null;
              const isInSuperset = !!exercise.supersetPairId;
              const isPairingTarget = !!(supersetPairingId && supersetPairingId !== exercise.id && !exercise.rotationGroupRef && !exercise.supersetPairId);
              const isPairingSource = supersetPairingId === exercise.id;

              return (
                <div key={exercise.id}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                    isSlot ? 'bg-purple-500/5 border border-purple-500/10'
                    : isInSuperset ? 'bg-purple-500/5 border-l-4 border-purple-500 border-r border-t border-b border-r-purple-500/10 border-t-purple-500/10 border-b-purple-500/10'
                    : isPairingTarget ? 'bg-secondary/50 border-2 border-dashed border-purple-500/40 cursor-pointer hover:bg-purple-500/10'
                    : isPairingSource ? 'bg-purple-500/10 border-2 border-purple-500/50'
                    : 'bg-secondary/50'
                  }`}
                  onClick={isPairingTarget ? () => handleSupersetToggle(exercise.id) : undefined}
                >
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(index, 'up')} disabled={index === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(index, 'down')} disabled={index === exercises.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isSlot ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Shuffle className="h-3.5 w-3.5 text-purple-400" />
                          <span className="font-medium text-purple-300">{slotGroup?.name || 'Groupe inconnu'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {slotGroup?.exercises.map(e => e.name).join(' → ') || 'Aucun exo'}
                        </div>
                      </>
                    ) : (
                      <>
                        {editingExerciseId === exercise.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingExerciseNewName}
                              onChange={(e) => setEditingExerciseNewName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') renameExercise(exercise.id, editingExerciseNewName); if (e.key === 'Escape') setEditingExerciseId(null); }}
                              className="h-7 text-sm input-dark"
                              list="exercise-names-datalist"
                              autoComplete="off"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-success" onClick={() => renameExercise(exercise.id, editingExerciseNewName)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isInSuperset && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-0.5 shrink-0">
                                <Zap className="h-3 w-3" />SS
                              </span>
                            )}
                            <span className="font-medium truncate block cursor-pointer hover:text-primary transition-colors group/name"
                              onClick={(ev) => { ev.stopPropagation(); setEditingExerciseId(exercise.id); setEditingExerciseNewName(exercise.name); }}>
                              {exercise.name}
                              <Pencil className="h-3 w-3 ml-1 inline opacity-0 group-hover/name:opacity-50 transition-opacity" />
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <button type="button" onClick={(ev) => { ev.stopPropagation(); updateSetCount(exercise.id, -1); }}
                              className="w-5 h-5 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center text-xs leading-none font-bold">−</button>
                            <span className="min-w-[1ch] text-center">{exercise.sets.length}</span>
                            <button type="button" onClick={(ev) => { ev.stopPropagation(); updateSetCount(exercise.id, 1); }}
                              className="w-5 h-5 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center text-xs leading-none font-bold">+</button>
                            séries
                          </span>
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); toggleExerciseMode(exercise.id); }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                            {exercise.mode === 'time' ? <><Timer className="h-3 w-3" /> Temps</> : <><Dumbbell className="h-3 w-3" /> Reps</>}
                          </button>
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); toggleSetType(exercise.id); }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                              exercise.sets[0]?.type === 'myo-rep' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : exercise.sets[0]?.type === 'hypertrophie' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}>
                            <RotateCcw className="h-3 w-3" />
                            {exercise.sets[0]?.type === 'myo-rep' ? 'Myo' : exercise.sets[0]?.type === 'hypertrophie' ? 'Hyp' : 'Force'}
                          </button>
                          {!isSlot && (
                            <button type="button" onClick={(ev) => { ev.stopPropagation(); handleSupersetToggle(exercise.id); }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                                isInSuperset ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                : isPairingSource ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500'
                                : 'bg-purple-500/10 text-muted-foreground hover:bg-purple-500/20'
                              }`}
                              title={isInSuperset ? 'Retirer du superset' : 'Créer un superset'}>
                              <Zap className="h-3 w-3" />SS
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(ev) => { ev.stopPropagation(); deleteExercise(exercise.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} className="btn-primary-gradient">Enregistrer la séance</Button>
      </div>

      <RenameOrReplaceDialog
        open={pendingRename !== null}
        oldName={pendingRename?.oldName || ''}
        newName={pendingRename?.newName || ''}
        historyEntries={pendingRenameHistoryCount}
        onRename={confirmRenameAsRename}
        onReplace={confirmRenameAsReplacement}
        onCancel={() => setPendingRename(null)}
      />
    </div>
  );
}
