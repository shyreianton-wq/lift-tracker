import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Session, Exercise, WorkoutSet, SetType, ExerciseMode, RotationGroupConfig, RotationExercise } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Timer, Dumbbell, RotateCcw, Shuffle, Settings, Pencil, Check, Zap, Link } from 'lucide-react';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Program) => void;
  editProgram?: Program;
  initialSessionId?: string;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function CreateProgramModal({ isOpen, onClose, onSave, editProgram, initialSessionId }: CreateProgramModalProps) {
  const [name, setName] = useState(editProgram?.name || '');
  const [description, setDescription] = useState(editProgram?.description || '');
  const [sessions, setSessions] = useState<Session[]>(editProgram?.sessions || []);
  const [rotationGroups, setRotationGroups] = useState<RotationGroupConfig[]>(editProgram?.rotationGroups || []);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingRotationGroups, setEditingRotationGroups] = useState(false);

  useEffect(() => {
    if (initialSessionId && editProgram && isOpen) {
      const session = editProgram.sessions.find(s => s.id === initialSessionId);
      if (session) setEditingSession(session);
    }
  }, [initialSessionId, editProgram, isOpen]);

  useEffect(() => {
    if (!isOpen) { setEditingSession(null); setEditingRotationGroups(false); }
  }, [isOpen]);

  // Only sync from editProgram when the modal opens, not on every editProgram change
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current && editProgram) {
      setName(editProgram.name);
      setDescription(editProgram.description || '');
      setSessions(editProgram.sessions);
      setRotationGroups(editProgram.rotationGroups || []);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editProgram]);

  const handleSave = () => {
    if (!name.trim()) return;
    const program: Program = {
      id: editProgram?.id || generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      sessions,
      createdAt: editProgram?.createdAt || new Date().toISOString(),
      rotationGroups: rotationGroups.length > 0 ? rotationGroups : undefined,
    };
    onSave(program);
    onClose();
  };

  const addSession = () => {
    setEditingSession({ id: generateId(), name: `Séance ${sessions.length + 1}`, exercises: [] });
  };

  const saveSession = (session: Session) => {
    const exists = sessions.find(s => s.id === session.id);
    setSessions(exists ? sessions.map(s => s.id === session.id ? session : s) : [...sessions, session]);
    setEditingSession(null);
  };

  const deleteSession = (sessionId: string) => setSessions(sessions.filter(s => s.id !== sessionId));

  // Rename exercise across ALL sessions (not just current one)
  const handleRenameGlobal = (oldName: string, newName: string) => {
    setSessions(sessions.map(s => ({
      ...s,
      exercises: s.exercises.map(e => e.name === oldName ? { ...e, name: newName } : e),
    })));
    // Also rename in rotation groups
    setRotationGroups(rotationGroups.map(g => ({
      ...g,
      exercises: g.exercises.map(e => e.name === oldName ? { ...e, name: newName } : e),
    })));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xl font-bold">
              {editProgram ? 'Modifier le programme' : 'Nouveau programme'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {editingRotationGroups ? (
              <RotationGroupsEditor
                groups={rotationGroups}
                onSave={(groups) => { setRotationGroups(groups); setEditingRotationGroups(false); }}
                onCancel={() => setEditingRotationGroups(false)}
              />
            ) : editingSession ? (
              <SessionEditor
                session={editingSession}
                onSave={saveSession}
                onCancel={() => setEditingSession(null)}
                rotationGroups={rotationGroups}
                allSessions={sessions}
                onRenameGlobal={handleRenameGlobal}
              />
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="programName">Nom du programme</Label>
                    <Input id="programName" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: PPL Force" className="mt-1.5 input-dark" />
                  </div>
                  <div>
                    <Label htmlFor="programDesc">Description (optionnel)</Label>
                    <Textarea id="programDesc" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Programme Push/Pull/Legs sur 4 jours" className="mt-1.5 input-dark resize-none" rows={2} />
                  </div>
                </div>

                {/* Rotation Groups Config */}
                <div>
                  <button
                    type="button"
                    onClick={() => setEditingRotationGroups(true)}
                    className="w-full flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl hover:bg-purple-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4 text-purple-400" />
                      <span className="font-medium text-sm">Groupes de rotation</span>
                      <span className="text-xs text-muted-foreground">
                        ({rotationGroups.length} groupe{rotationGroups.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Sessions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Séances ({sessions.length})</Label>
                    <Button size="sm" variant="secondary" onClick={addSession}>
                      <Plus className="h-4 w-4 mr-1" />Ajouter
                    </Button>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <p>Aucune séance</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="font-medium">{session.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {session.exercises.length} exercices
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setEditingSession(session)}>Modifier</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSession(session.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!editingSession && !editingRotationGroups && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSave} disabled={!name.trim()} className="btn-primary-gradient">
                {editProgram ? 'Enregistrer' : 'Créer le programme'}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==============================
// Rotation Groups Editor
// ==============================
function RotationGroupsEditor({
  groups,
  onSave,
  onCancel,
}: {
  groups: RotationGroupConfig[];
  onSave: (groups: RotationGroupConfig[]) => void;
  onCancel: () => void;
}) {
  const [localGroups, setLocalGroups] = useState<RotationGroupConfig[]>(groups);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const addGroup = () => {
    const newGroup: RotationGroupConfig = {
      id: generateId(),
      name: '',
      exercises: [],
    };
    setLocalGroups([...localGroups, newGroup]);
    setEditingGroupId(newGroup.id);
  };

  const deleteGroup = (groupId: string) => {
    setLocalGroups(localGroups.filter(g => g.id !== groupId));
    if (editingGroupId === groupId) setEditingGroupId(null);
  };

  const updateGroup = (updated: RotationGroupConfig) => {
    setLocalGroups(localGroups.map(g => g.id === updated.id ? updated : g));
  };

  const editingGroup = localGroups.find(g => g.id === editingGroupId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>← Retour</Button>
        <h3 className="font-semibold flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-purple-400" />
          Groupes de rotation
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Définissez des groupes d'exercices qui alternent automatiquement. Dans une séance, ajoutez un "slot rotation" au lieu de l'exercice.
      </p>

      {editingGroup ? (
        <RotationGroupDetail
          group={editingGroup}
          onSave={(g) => { updateGroup(g); setEditingGroupId(null); }}
          onCancel={() => setEditingGroupId(null)}
        />
      ) : (
        <>
          {localGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Shuffle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucun groupe de rotation</p>
              <p className="text-xs mt-1">Créez-en un pour alterner les exercices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localGroups.map(group => (
                <div key={group.id} className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                  <Shuffle className="h-4 w-4 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{group.name || '(sans nom)'}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {group.exercises.length} exo{group.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingGroupId(group.id)}>Modifier</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button size="sm" variant="secondary" onClick={addGroup}>
              <Plus className="h-4 w-4 mr-1" />Nouveau groupe
            </Button>
            <Button size="sm" onClick={() => onSave(localGroups)} className="btn-primary-gradient">
              Enregistrer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ==============================
// Single Rotation Group Detail Editor
// ==============================
function RotationGroupDetail({
  group,
  onSave,
  onCancel,
}: {
  group: RotationGroupConfig;
  onSave: (group: RotationGroupConfig) => void;
  onCancel: () => void;
}) {
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

// ==============================
// Exercise Creator for Rotation Groups
// ==============================
function RotationExerciseCreator({ onSave, onCancel }: { onSave: (ex: RotationExercise) => void; onCancel: () => void }) {
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
      id: generateId(),
      type: setType,
      targetReps: exerciseMode === 'reps' ? targetReps : 0,
      targetWeight,
      targetDuration: exerciseMode === 'time' ? targetDuration : undefined,
      isCompleted: false,
    }));
    onSave({ id: generateId(), name: name.trim(), sets, mode: exerciseMode, notes: notes.trim() || undefined });
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-secondary/30 rounded-xl border border-border mb-4 space-y-4"
    >
      <div>
        <Label htmlFor="rotExName">Nom de l'exercice</Label>
        <Input id="rotExName" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Curl Barre" className="mt-1.5 input-dark" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Mode</Label>
          <div className="flex gap-2 mt-1.5">
            <Button type="button" variant={exerciseMode === 'reps' ? 'default' : 'secondary'} size="sm"
              onClick={() => setExerciseMode('reps')} className={exerciseMode === 'reps' ? 'btn-primary-gradient' : ''}>
              <Dumbbell className="h-3 w-3 mr-1" />Reps
            </Button>
            <Button type="button" variant={exerciseMode === 'time' ? 'default' : 'secondary'} size="sm"
              onClick={() => setExerciseMode('time')} className={exerciseMode === 'time' ? 'btn-primary-gradient' : ''}>
              <Timer className="h-3 w-3 mr-1" />Temps
            </Button>
          </div>
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1.5">
            <Button type="button" variant={setType === 'force' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('force'); setNumSets(3); }} className={setType === 'force' ? 'btn-primary-gradient' : ''}>
              Force
            </Button>
            <Button type="button" variant={setType === 'hypertrophie' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('hypertrophie'); setNumSets(3); }} className={setType === 'hypertrophie' ? 'btn-primary-gradient' : ''}>
              Hyp
            </Button>
            <Button type="button" variant={setType === 'myo-rep' ? 'default' : 'secondary'} size="sm"
              onClick={() => { setSetType('myo-rep'); setNumSets(2); }} className={setType === 'myo-rep' ? 'btn-primary-gradient' : ''}>
              Myo
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Séries</Label>
          <Input type="number" value={numSets} onChange={(e) => setNumSets(parseInt(e.target.value) || 1)} min={1} max={10} className="mt-1.5 input-dark" />
        </div>
        {exerciseMode === 'reps' ? (
          <div><Label>Reps</Label><Input type="number" value={targetReps} onChange={(e) => setTargetReps(parseInt(e.target.value) || 1)} min={1} className="mt-1.5 input-dark" /></div>
        ) : (
          <div><Label>Durée (s)</Label><Input type="number" value={targetDuration} onChange={(e) => setTargetDuration(parseInt(e.target.value) || 10)} min={1} className="mt-1.5 input-dark" /></div>
        )}
        <div><Label>Poids (kg)</Label><Input type="number" step="0.5" value={targetWeight} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)} min={0} className="mt-1.5 input-dark" /></div>
      </div>
      <div>
        <Label>Notes (optionnel)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Tempo 3-1-1" className="mt-1.5 input-dark" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()} className="btn-primary-gradient">Ajouter</Button>
      </div>
    </motion.div>
  );
}

// ==============================
// Session Editor
// ==============================
interface SessionEditorProps {
  session: Session;
  onSave: (session: Session) => void;
  onCancel: () => void;
  rotationGroups: RotationGroupConfig[];
  allSessions: Session[];
  onRenameGlobal?: (oldName: string, newName: string) => void;
}

function SessionEditor({ session, onSave, onCancel, rotationGroups, allSessions, onRenameGlobal }: SessionEditorProps) {
  const [name, setName] = useState(session.name);
  const [sessionType, setSessionType] = useState<'force' | 'hypertrophie' | 'myo-rep' | undefined>(session.type);
  const [exercises, setExercises] = useState<Exercise[]>(session.exercises);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseNewName, setEditingExerciseNewName] = useState('');
  const [supersetPairingId, setSupersetPairingId] = useState<string | null>(null);

  const handleSave = () => onSave({ ...session, name, type: sessionType, exercises });

  const renameExercise = (exerciseId: string, newName: string) => {
    if (!newName.trim()) return;
    const oldExercise = exercises.find(e => e.id === exerciseId);
    if (!oldExercise) return;
    const oldName = oldExercise.name;
    setExercises(exercises.map(e => e.name === oldName ? { ...e, name: newName.trim() } : e));
    if (onRenameGlobal && oldName !== newName.trim()) {
      onRenameGlobal(oldName, newName.trim());
    }
    setEditingExerciseId(null);
    setEditingExerciseNewName('');
  };

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
    return Array.from(names).sort();
  }, [exercises, rotationGroups, allSessions]);

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
              const isPairingTarget = supersetPairingId && supersetPairingId !== exercise.id && !exercise.rotationGroupRef && !exercise.supersetPairId;
              const isPairingSource = supersetPairingId === exercise.id;
              // Find superset partner
              const supersetPartner = isInSuperset ? exercises.find(e => e.id !== exercise.id && e.supersetPairId === exercise.supersetPairId) : null;
              const isFirstInPair = isInSuperset && exercises.findIndex(e => e.supersetPairId === exercise.supersetPairId) === index;

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
    </div>
  );
}

// ==============================
// Simple Exercise Creator (non-rotation)
// ==============================
function ExerciseCreator({ onSave, onCancel, existingNames = [] }: { onSave: (ex: Exercise) => void; onCancel: () => void; existingNames?: string[] }) {
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
