import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Shuffle } from 'lucide-react';
import { RotationGroupConfig } from '@/types/workout';
import { generateId } from './programModalUtils';
import { RotationGroupDetail } from './RotationGroupDetail';

interface Props {
  groups: RotationGroupConfig[];
  onSave: (groups: RotationGroupConfig[]) => void;
  onCancel: () => void;
}

export function RotationGroupsEditor({ groups, onSave, onCancel }: Props) {
  const [localGroups, setLocalGroups] = useState<RotationGroupConfig[]>(groups);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const addGroup = () => {
    const newGroup: RotationGroupConfig = {
      id: generateId(),
      name: '',
      exercises: [],
    };
    setLocalGroups([...localGroups, newGroup]);
    setEditingGroupId(newGroup.id);
  };

  const deleteGroup = (groupId: string) => {
    setLocalGroups(localGroups.filter(g => g.id !== groupId));
    if (editingGroupId === groupId) setEditingGroupId(null);
  };

  const updateGroup = (updated: RotationGroupConfig) => {
    setLocalGroups(localGroups.map(g => g.id === updated.id ? updated : g));
  };

  const editingGroup = localGroups.find(g => g.id === editingGroupId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>← Retour</Button>
        <h3 className="font-semibold flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-purple-400" />
          Groupes de rotation
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Définissez des groupes d'exercices qui alternent automatiquement. Dans une séance, ajoutez un "slot rotation" au lieu de l'exercice.
      </p>

      {editingGroup ? (
        <RotationGroupDetail
          group={editingGroup}
          onSave={(g) => { updateGroup(g); setEditingGroupId(null); }}
          onCancel={() => setEditingGroupId(null)}
        />
      ) : (
        <>
          {localGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Shuffle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucun groupe de rotation</p>
              <p className="text-xs mt-1">Créez-en un pour alterner les exercices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localGroups.map(group => (
                <div key={group.id} className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                  <Shuffle className="h-4 w-4 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{group.name || '(sans nom)'}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {group.exercises.length} exo{group.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingGroupId(group.id)}>Modifier</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button size="sm" variant="secondary" onClick={addGroup}>
              <Plus className="h-4 w-4 mr-1" />Nouveau groupe
            </Button>
            <Button size="sm" onClick={() => onSave(localGroups)} className="btn-primary-gradient">
              Enregistrer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
