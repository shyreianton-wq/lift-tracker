import { motion } from 'framer-motion';
import { Program } from '@/types/workout';
import { Calendar, ChevronRight, Dumbbell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProgramCardProps {
  program: Program;
  onClick: () => void;
  onDelete?: () => void;
}

export function ProgramCard({ program, onClick, onDelete }: ProgramCardProps) {
  const totalExercises = program.sessions.reduce(
    (acc, session) => acc + session.exercises.length,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-card card-gradient rounded-xl border border-border overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 btn-primary-gradient" />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {program.name}
            </h3>
            {program.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {program.description}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{program.sessions.length} séances</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4" />
            <span>{totalExercises} exercices</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Créé le {format(new Date(program.createdAt), 'd MMM yyyy', { locale: fr })}
          </span>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
