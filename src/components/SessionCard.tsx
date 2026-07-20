import { motion } from 'framer-motion';
import { Session } from '@/types/workout';
import { Play, Dumbbell, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SessionCardProps {
  session: Session;
  index: number;
  highlight?: boolean;
  onStart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export function SessionCard({ session, index, highlight, onStart, onEdit, onDelete, onClick }: SessionCardProps) {
  const totalSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );

  const getSessionTypeBadge = () => {
    if (!session.type) return null;
    if (session.type === 'myo-rep') {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 bg-orange-500/20 text-orange-400">
          MYO
        </Badge>
      );
    }
    if (session.type === 'hypertrophie') {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 bg-blue-500/20 text-blue-400">
          HYP
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 bg-green-500/20 text-green-400">
        FORCE
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group bg-secondary/50 hover:bg-secondary/80 rounded-xl p-4 transition-all border cursor-pointer ${highlight ? 'session-todo' : 'border-transparent hover:border-border'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            {index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{session.name}</h4>
              {getSessionTypeBadge()}
              {highlight && (
                <Badge variant="secondary" className="text-[10px] px-1.5 bg-primary/20 text-primary">À faire</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Dumbbell className="h-3 w-3" />
              <span>{session.exercises.length} exercices</span>
              <span>•</span>
              <span>{totalSets} séries</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStart && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="btn-primary-gradient glow-primary"
            >
              <Play className="h-4 w-4 mr-1" />
              S'entraîner
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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
