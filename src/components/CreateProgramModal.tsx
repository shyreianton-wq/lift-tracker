import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Session, RotationGroupConfig } from '@/types/workout';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  X, Plus, Trash2, Shuffle, Settings, ChevronUp, ChevronDown,
} from 'lucide-react';
import { generateId } from './program-modal/programModalUtils';
import { RotationGroupsEditor } from './program-modal/RotationGroupsEditor';
import { SessionEditor } from './program-modal/SessionEditor';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Program) => void;
  editProgram?: Program;
  initialSessionId?: string;
}

export function CreateProgramModal({
  isOpen, onClose, onSave, editProgram, initialSessionId,
}: CreateProgramModalProps) {
  const [name, setName] = useState(editProgram?.name || '');
  const [description, setDescription] = useState(editProgram?.description || '');
  const [sessions, setSessions] = useState<Session[]>(editProgram?.sessions || []);
  const [rotationGroups, setRotationGroups] = useState<RotationGroupConfig[]>(editProgram?.rotationGroups || []);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingRotationGroups, setEditingRotationGroups] = useState(false);

  const { history } = useWorkout();
  const historyExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const h of history) if (h.exerciseName) names.add(h.exerciseName);
    return Array.from(names);
  }, [history]);

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

  // Réordonner les séances (monter/descendre). L'ordre du tableau = ordre d'affichage.
  // N'impacte ni l'historique (matché par nom) ni les séances actives (référencées par id).
  const moveSession = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sessions.length) return;
    const next = [...sessions];
    [next[index], next[target]] = [next[target], next[index]];
    setSessions(next);
  };

  // Rename exercise across ALL sessions (not just current one) and rotation groups
  const handleRenameGlobal = (oldName: string, newName: string) => {
    setSessions(sessions.map(s => ({
      ...s,
      exercises: s.exercises.map(e => e.name === oldName ? { ...e, name: newName } : e),
    })));
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
                historyExerciseNames={historyExerciseNames}
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
                      {sessions.map((session, index) => (
                        <div key={session.id} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                          <div className="flex flex-col -my-1">
                            <button type="button" aria-label="Monter la séance" disabled={index === 0}
                              onClick={() => moveSession(index, -1)}
                              className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="Descendre la séance" disabled={index === sessions.length - 1}
                              onClick={() => moveSession(index, 1)}
                              className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
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
