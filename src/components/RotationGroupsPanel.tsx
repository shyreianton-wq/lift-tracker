import { motion } from 'framer-motion';
import { Program } from '@/types/workout';
import { Shuffle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';

interface RotationGroupsPanelProps {
  program: Program;
  activeRotations?: Record<string, string>;
}

export function RotationGroupsPanel({ program, activeRotations }: RotationGroupsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const groups = program.rotationGroups || [];

  if (groups.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-sm text-foreground">Groupes de rotation</span>
          <span className="text-xs text-muted-foreground">
            ({groups.length} groupe{groups.length > 1 ? 's' : ''})
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-3">
          {groups.map((group) => {
            const activeId = activeRotations?.[group.id];
            return (
              <div key={group.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    🔄 {group.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {group.exercises.length} exercice{group.exercises.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.exercises.map((exercise) => {
                    const isActive = activeId === exercise.id;
                    return (
                      <div key={exercise.id}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                          isActive ? 'bg-purple-500/15 border border-purple-500/30' : 'bg-secondary/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />}
                          <span className={isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {exercise.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {exercise.sets.length}×{exercise.mode === 'time' ? `${exercise.sets[0]?.targetDuration}s` : `${exercise.sets[0]?.targetReps}r`} @ {exercise.sets[0]?.targetWeight}kg
                        </span>
                      </div>
                    );
                  })}
                </div>
                {activeId && (
                  <p className="text-xs text-purple-400/70 mt-2">
                    ▸ Prochain : {group.exercises.find(e => e.id === activeId)?.name || '—'}
                  </p>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
