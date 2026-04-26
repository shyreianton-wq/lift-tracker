import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/useUser";
import { useWorkout } from "@/contexts/WorkoutContext";
import { ProgramCard } from "@/components/ProgramCard";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell, BarChart3, Users, Bot, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { CreateProgramModal } from "@/components/CreateProgramModal";
import { Program } from "@/types/workout";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { programs, activeWorkout, addProgram, updateProgram, deleteProgram, isLoaded } = useWorkout();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>();
  const navigate = useNavigate();
  const { user } = useUser();

  // Show splash only on first visit (per session) or when triggered by logo click
  const hasSeenSplash = sessionStorage.getItem("hasSeenSplash") === "true";
  const [showSplash, setShowSplash] = useState(!hasSeenSplash);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Auto-redirect to active training session after data loads
  useEffect(() => {
    if (isLoaded && activeWorkout) {
      navigate(`/training/${activeWorkout.programId}/${activeWorkout.sessionId}`, { replace: true });
    }
  }, [isLoaded, activeWorkout, navigate]);

  const triggerSplash = () => {
    setShowSplash(true);
  };

  // Splash Screen
  if (showSplash || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative text-center"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-3xl btn-primary-gradient flex items-center justify-center mx-auto glow-primary shadow-2xl">
              <Dumbbell className="h-12 w-12 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-4xl font-bold text-foreground tracking-tight mb-3"
          >
            Fit Tracker
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-muted-foreground text-lg"
          >
            Push your limits
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 1.2 }}
            className="mt-8"
          >
            <div className="w-8 h-1 bg-primary/50 rounded-full mx-auto animate-pulse" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen bg-background"
      >
        {/* Header */}
        <header className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

          <div className="container relative py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={triggerSplash}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-11 h-11 rounded-xl btn-primary-gradient flex items-center justify-center glow-primary">
                  <Dumbbell className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Fit Tracker</h1>
                  {user && <p className="text-sm text-muted-foreground">Bonjour {user.name} 👋</p>}
                </div>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/coach")}
                  variant="outline"
                  className="h-11 px-4"
                >
                  <Bot className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => navigate("/history")}
                  className="h-11 px-5 btn-primary-gradient glow-primary font-semibold"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Historique
                </Button>
                {user?.isAdmin && (
                  <Button onClick={() => navigate("/admin")} variant="outline" className="h-11 px-4">
                    <Users className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container py-6">
          {/* Programs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Mes programmes</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate('/ai-builder')}
                  size="sm"
                  className="btn-primary-gradient glow-primary"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Créer
                </Button>
                <Button
                  onClick={() => {
                    setEditingProgram(undefined);
                    setShowCreateModal(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nouveau
                </Button>
              </div>
            </div>

            {programs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-gradient-to-b from-secondary/20 to-transparent"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Commencez maintenant
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Creez votre premier programme
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary-gradient glow-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Creer un programme
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programs.map((program, index) => (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <ProgramCard
                      program={program}
                      onClick={() => navigate(`/program/${program.id}`)}
                      onDelete={() => deleteProgram(program.id)}
                    />
                  </motion.div>
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
      </motion.div>
    </AnimatePresence>
  );
}
