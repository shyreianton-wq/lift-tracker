import { motion } from 'framer-motion';
import { useWorkout } from '@/contexts/WorkoutContext';
import { ProgramCard } from '@/components/ProgramCard';
import { Button } from '@/components/ui/button';
import { Plus, Dumbbell, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { CreateProgramModal } from '@/components/CreateProgramModal';
import { Program } from '@/types/workout';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { programs, addProgram, updateProgram, deleteProgram, isLoaded, history } = useWorkout();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>();
  const navigate = useNavigate();

  const totalWorkouts = new Set(
    history.map(h => `${h.programId}-${h.sessionId}-${h.completedAt.split('T')[0]}`)
  ).size;

  const totalSets = history.length;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-primary-gradient flex items-center justify-center glow-primary">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FitTrack</h1>
                <p className="text-xs text-muted-foreground">Suivi musculation</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingProgram(undefined);
                setShowCreateModal(true);
              }}
              className="btn-primary-gradient glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau programme
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-8">
        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-card card-gradient rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{programs.length}</p>
                <p className="text-xs text-muted-foreground">Programmes</p>
              </div>
            </div>
          </div>
          <div className="bg-card card-gradient rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Séances</p>
              </div>
            </div>
          </div>
          <div className="bg-card card-gradient rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSets}</p>
                <p className="text-xs text-muted-foreground">Séries validées</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Programs */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Mes programmes</h2>
          
          {programs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 border-2 border-dashed border-border rounded-2xl"
            >
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun programme
              </h3>
              <p className="text-muted-foreground mb-6">
                Créez votre premier programme pour commencer
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary-gradient glow-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un programme
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onClick={() => navigate(`/program/${program.id}`)}
                  onDelete={() => deleteProgram(program.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create/Edit Modal */}
      <CreateProgramModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProgram(undefined);
        }}
        onSave={(program) => {
          if (editingProgram) {
            updateProgram(program);
          } else {
            addProgram(program);
          }
        }}
        editProgram={editingProgram}
      />
    </div>
  );
}
