import { Zap } from 'lucide-react';
import { Exercise } from '@/types/workout';

interface SupersetBannerProps {
  exercises: [Exercise, Exercise];
  supersetActiveIdx: number;
}

export function SupersetBanner({ exercises, supersetActiveIdx }: SupersetBannerProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <Zap className="h-3 w-3 text-purple-400" />
      <span className="text-xs text-purple-400 font-medium">Superset</span>
      <span className="text-xs text-muted-foreground">
        {supersetActiveIdx === 0 ? exercises[1]?.name : exercises[0]?.name} ensuite
      </span>
    </div>
  );
}
