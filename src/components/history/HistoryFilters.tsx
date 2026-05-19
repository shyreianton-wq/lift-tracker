import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Program, Session } from '@/types/workout';

interface HistoryFiltersProps {
  programs: Program[];
  selectedProgram: string;
  selectedSession: string;
  availableSessions: Session[];
  onChangeProgram: (programId: string) => void;
  onChangeSession: (sessionId: string) => void;
}

export function HistoryFilters({
  programs, selectedProgram, selectedSession,
  availableSessions, onChangeProgram, onChangeSession,
}: HistoryFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <Select value={selectedProgram} onValueChange={onChangeProgram}>
            <SelectTrigger><SelectValue placeholder="Programme" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les programmes</SelectItem>
              {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSession} onValueChange={onChangeSession} disabled={selectedProgram === 'all'}>
            <SelectTrigger><SelectValue placeholder="Séance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les séances</SelectItem>
              {availableSessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
