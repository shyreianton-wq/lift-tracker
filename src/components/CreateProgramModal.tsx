import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Session, Exercise, WorkoutSet, SetType } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Program) => void;
  editProgram?: Program;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function CreateProgramModal({ isOpen, onClose, onSave, editProgram }: CreateProgramModalProps) {
  const [name, setName] = useState(editProgram?.name || '');
  const [description, setDescription] = useState(editProgram?.description || '');
  const [sessions, setSessions] = useState<Session[]>(editProgram?.sessions || []);
  const [currentStep, setCurrentStep] = useState<'program' | 'sessions'>('program');
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;

    const program: Program = {
      id: editProgram?.id || generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      sessions,
      createdAt: editProgram?.createdAt || new Date().toISOString(),
    };

    onSave(program);
    onClose();
  };

  const addSession = () => {
    const newSession: Session = {
      id: generateId(),
      name: `Séance ${sessions.length + 1}`,
      exercises: [],
    };
    setEditingSession(newSession);
  };

  const saveSession = (session: Session) => {
    const exists = sessions.find(s => s.id === session.id);
    if (exists) {
      setSessions(sessions.map(s => s.id === session.id ? session : s));
    } else {
      setSessions([...sessions, session]);
    }
    setEditingSession(null);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xl font-bold">
              {editProgram ? 'Modifier le programme' : 'Nouveau programme'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {editingSession ? (
              <SessionEditor
                session={editingSession}
                onSave={saveSession}
                onCancel={() => setEditingSession(null)}
              />
            ) : (
              <div className="space-y-6">
                {/* Program info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du programme</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Push Pull Legs"
                      className="mt-1.5 input-dark"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre programme..."
                      className="mt-1.5 input-dark resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Sessions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Séances ({sessions.length})</Label>
                    <Button size="sm" variant="secondary" onClick={addSession}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <p>Aucune séance</p>
                      <p className="text-sm">Cliquez sur "Ajouter" pour créer votre première séance</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session, index) => (
                        <div
                          key={session.id}
                          className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg group"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="font-medium">{session.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {session.exercises.length} exercices
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSession(session)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSession(session.id)}
                          >
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

          {/* Footer */}
          {!editingSession && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim()}
                className="btn-primary-gradient"
              >
                {editProgram ? 'Enregistrer' : 'Créer le programme'}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Session Editor Component
interface SessionEditorProps {
  session: Session;
  onSave: (session: Session) => void;
  onCancel: () => void;
}

function SessionEditor({ session, onSave, onCancel }: SessionEditorProps) {
  const [name, setName] = useState(session.name);
  const [exercises, setExercises] = useState<Exercise[]>(session.exercises);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const handleSave = () => {
    onSave({
      ...session,
      name,
      exercises,
    });
  };

  const addExercise = (exercise: Exercise) => {
    setExercises([...exercises, exercise]);
    setShowAddExercise(false);
  };

  const deleteExercise = (exerciseId: string) => {
    setExercises(exercises.filter(e => e.id !== exerciseId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ← Retour
        </Button>
        <h3 className="font-semibold">Modifier la séance</h3>
      </div>

      <div>
        <Label htmlFor="sessionName">Nom de la séance</Label>
        <Input
          id="sessionName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Push Day"
          className="mt-1.5 input-dark"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Exercices ({exercises.length})</Label>
          <Button size="sm" variant="secondary" onClick={() => setShowAddExercise(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un exercice
          </Button>
        </div>

        {showAddExercise && (
          <ExerciseCreator
            onSave={addExercise}
            onCancel={() => setShowAddExercise(false)}
          />
        )}

        {exercises.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p>Aucun exercice</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <span className="font-medium">{exercise.name}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{exercise.sets.length} séries</span>
                    <Badge variant="secondary" className="text-xs">
                      {exercise.sets[0]?.type === 'myo-rep' ? 'Myo-rep' : 'Force'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteExercise(exercise.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSave} className="btn-primary-gradient">
          Enregistrer la séance
        </Button>
      </div>
    </div>
  );
}

// Exercise Creator Component
interface ExerciseCreatorProps {
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
}

function ExerciseCreator({ onSave, onCancel }: ExerciseCreatorProps) {
  const [name, setName] = useState('');
  const [setType, setSetType] = useState<SetType>('force');
  const [numSets, setNumSets] = useState(3);
  const [targetReps, setTargetReps] = useState(10);
  const [targetWeight, setTargetWeight] = useState(20);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;

    const sets: WorkoutSet[] = Array.from({ length: numSets }, (_, i) => ({
      id: generateId(),
      type: setType,
      targetReps,
      targetWeight,
      isCompleted: false,
    }));

    const exercise: Exercise = {
      id: generateId(),
      name: name.trim(),
      sets,
      notes: notes.trim() || undefined,
    };

    onSave(exercise);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-secondary/30 rounded-xl border border-border mb-4 space-y-4"
    >
      <div>
        <Label htmlFor="exerciseName">Nom de l'exercice</Label>
        <Input
          id="exerciseName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Développé couché"
          className="mt-1.5 input-dark"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de série</Label>
          <div className="flex gap-2 mt-1.5">
            <Button
              type="button"
              variant={setType === 'force' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSetType('force')}
              className={setType === 'force' ? 'btn-primary-gradient' : ''}
            >
              Force
            </Button>
            <Button
              type="button"
              variant={setType === 'myo-rep' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSetType('myo-rep')}
              className={setType === 'myo-rep' ? 'btn-primary-gradient' : ''}
            >
              Myo-rep
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="numSets">Nombre de séries</Label>
          <Input
            id="numSets"
            type="number"
            value={numSets}
            onChange={(e) => setNumSets(parseInt(e.target.value) || 1)}
            min={1}
            max={10}
            className="mt-1.5 input-dark"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="targetReps">Répétitions cibles</Label>
          <Input
            id="targetReps"
            type="number"
            value={targetReps}
            onChange={(e) => setTargetReps(parseInt(e.target.value) || 1)}
            min={1}
            className="mt-1.5 input-dark"
          />
        </div>
        <div>
          <Label htmlFor="targetWeight">Poids cible (kg)</Label>
          <Input
            id="targetWeight"
            type="number"
            step="0.5"
            value={targetWeight}
            onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
            min={0}
            className="mt-1.5 input-dark"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Tempo 3-1-1"
          className="mt-1.5 input-dark"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!name.trim()}
          className="btn-primary-gradient"
        >
          Ajouter l'exercice
        </Button>
      </div>
    </motion.div>
  );
}
