import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, Play } from 'lucide-react';
import { SessionCard } from '@/components/SessionCard';
import { useMemo, useState } from 'react';
import { CreateProgramModal } from '@/components/CreateProgramModal';
import { RotationGroupsPanel } from '@/components/RotationGroupsPanel';

export default function ProgramDetail() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { programs, updateProgram, startWorkout, activeWorkout, history } = useWorkout();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | undefined>();

  const program = programs.find(p => p.id === programId);

  // Séance "à faire" = la moins récemment effectuée (jamais faite = prioritaire).
  const nextSessionId = useMemo(() => {
    if (!program) return null;
    const lastDone = new Map<string, number>();
    for (const h of history) {
      if (h.programId !== program.id) continue;
      const t = new Date(h.completedAt).getTime();
      if (t > (lastDone.get(h.sessionId) ?? -Infinity)) lastDone.set(h.sessionId, t);
    }
    let best: string | null = null; let bestT = Infinity;
    for (const s of program.sessions) {
      const t = lastDone.has(s.id) ? (lastDone.get(s.id) as number) : -1;
      if (t < bestT) { bestT = t; best = s.id; }
    }
    return best;
  }, [program, history]);

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Programme introuvable</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const handleStartSession = (sessionId: string) => {
    startWorkout(program.id, sessionId);
    navigate(`/training/${program.id}/${sessionId}`);
  };

  // Get active rotations from current workout if it's for this program
  const currentRotations = activeWorkout?.programId === program.id
    ? activeWorkout.activeRotations
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{program.name}</h1>
                {program.description && (
                  <p className="text-sm text-muted-foreground">{program.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Séances ({program.sessions.length})
          </h2>
        </div>

        {program.sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 border-2 border-dashed border-border rounded-2xl"
          >
            <p className="text-muted-foreground mb-4">
              Aucune séance dans ce programme
            </p>
            <Button
              onClick={() => setShowEditModal(true)}
              className="btn-primary-gradient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter des séances
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {program.sessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                highlight={session.id === nextSessionId}
                onStart={() => handleStartSession(session.id)}
                onEdit={() => { setEditSessionId(session.id); setShowEditModal(true); }}
              />
            ))}
          </div>
        )}

        {/* Rotation Groups Panel */}
        <RotationGroupsPanel
          program={program}
          activeRotations={currentRotations}
        />
      </main>

      {/* Edit Modal */}
      <CreateProgramModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditSessionId(undefined); }}
        onSave={updateProgram}
        editProgram={program}
        initialSessionId={editSessionId}
      />
    </div>
  );
}
