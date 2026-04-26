import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Eye, Share2, RefreshCw, Trophy, BarChart3, Calendar, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '@/config';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfWeek, subDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { WorkoutHistory, Program } from '@/types/workout';

// ==============================
// Helpers (from History.tsx)
// ==============================
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getExerciseName(programs: Program[], exerciseId: string): string {
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) return e.name;
      }
    }
  }
  return '?';
}

function getExerciseMode(programs: Program[], exerciseId: string): string {
  for (const p of programs) {
    for (const s of p.sessions) {
      for (const e of s.exercises) {
        if (e.id === exerciseId) return e.mode || 'reps';
      }
    }
  }
  return 'reps';
}

// ==============================
// User PR Section
// ==============================
type PR = {
  exerciseName: string;
  type: 'force' | 'hypertrophie' | 'myo-rep' | 'time';
  bestSetWeight: number;
  bestSetReps: number;
  bestSetVolume: number;
  bestSetDate: string;
  maxWeight: number;
  maxWeightDate: string;
  maxDuration: number;
  maxDurationDate: string;
  isRecentPR: boolean;
};

function computePRs(history: WorkoutHistory[], programs: Program[]) {
  const byKey = new Map<string, WorkoutHistory[]>();
  for (const h of history) {
    const name = getExerciseName(programs, h.exerciseId);
    if (name === '?') continue;
    const mode = getExerciseMode(programs, h.exerciseId);
    const type = mode === 'time' ? 'time' : (h.setType || 'force');
    const key = `${name}__${type}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(h);
  }

  const oneWeekAgo = subDays(new Date(), 7);
  const force: PR[] = [];
  const myo: PR[] = [];
  const time: PR[] = [];

  byKey.forEach((entries, key) => {
    const [name, type] = key.split('__');

    // For myo-rep: only the FIRST set (activation set) counts for records
    let filteredEntries = entries;
    if (type === 'myo-rep') {
      const firstSetBySession = new Map<string, typeof entries[0]>();
      const sorted = [...entries].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      for (const h of sorted) {
        const sessionKey = `${h.sessionId}__${h.exerciseId}__${h.completedAt.slice(0, 10)}`;
        if (!firstSetBySession.has(sessionKey)) {
          firstSetBySession.set(sessionKey, h);
        }
      }
      filteredEntries = Array.from(firstSetBySession.values());
    }

    let bestSetWeight = 0, bestSetReps = 0, bestSetVolume = 0, bestSetDate = '';
    let maxWeight = 0, maxWeightDate = '';
    let maxDuration = 0, maxDurationDate = '';

    for (const h of filteredEntries) {
      const vol = h.weight * h.reps;
      if (vol > bestSetVolume) {
        bestSetVolume = vol;
        bestSetWeight = h.weight;
        bestSetReps = h.reps;
        bestSetDate = h.completedAt;
      }
      if (h.weight > maxWeight) { maxWeight = h.weight; maxWeightDate = h.completedAt; }
      if ((h.duration || 0) > maxDuration) { maxDuration = h.duration || 0; maxDurationDate = h.completedAt; }
    }

    const isRecentPR = (bestSetDate && isAfter(parseISO(bestSetDate), oneWeekAgo)) ||
                       (maxWeightDate && isAfter(parseISO(maxWeightDate), oneWeekAgo)) ||
                       (maxDurationDate && isAfter(parseISO(maxDurationDate), oneWeekAgo));

    const pr: PR = {
      exerciseName: name, type: type as PR['type'],
      bestSetWeight, bestSetReps, bestSetVolume, bestSetDate,
      maxWeight, maxWeightDate,
      maxDuration, maxDurationDate,
      isRecentPR: !!isRecentPR,
    };

    if (type === 'time') time.push(pr);
    else if (type === 'hypertrophie') force.push(pr);
    else if (type === 'myo-rep') myo.push(pr);
    else force.push(pr);
  });

  const sortPRs = (arr: PR[]) => arr.sort((a, b) => {
    if (a.isRecentPR && !b.isRecentPR) return -1;
    if (!a.isRecentPR && b.isRecentPR) return 1;
    return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
  });

  return { forcePRs: sortPRs(force), myoPRs: sortPRs(myo), timePRs: sortPRs(time) };
}

function computeWeeklyVolume(history: WorkoutHistory[], programs: Program[]) {
  if (history.length === 0) return [];
  const byWeek = new Map<string, { week: string; force: number; hyp: number; myo: number }>();
  for (const h of history) {
    const date = parseISO(h.completedAt);
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, { week: weekStart, force: 0, hyp: 0, myo: 0 });
    const w = byWeek.get(weekStart)!;
    const vol = h.weight * h.reps;
    const mode = getExerciseMode(programs, h.exerciseId);
    const type = mode === 'time' ? 'time' : (h.setType || 'force');
    if (type === 'hypertrophie') w.hyp += vol;
    else if (type === 'myo-rep') w.myo += vol;
    else if (type !== 'time') w.force += vol;
  }
  return Array.from(byWeek.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8)
    .map(w => ({
      week: format(parseISO(w.week), 'd MMM', { locale: fr }),
      Force: Math.round(w.force),
      Hyp: Math.round(w.hyp),
      Myo: Math.round(w.myo),
    }));
}

function computeLastSessions(history: WorkoutHistory[]) {
  if (history.length === 0) return [];
  // Group by session occurrence (date key = date part of completedAt)
  // Group by day+programId+sessionId combo
  const byKey = new Map<string, { date: string; programId: string; sessionId: string; entries: WorkoutHistory[] }>();
  for (const h of history) {
    const day = h.completedAt.split('T')[0];
    const key = `${day}__${h.programId}__${h.sessionId}`;
    if (!byKey.has(key)) byKey.set(key, { date: h.completedAt, programId: h.programId, sessionId: h.sessionId, entries: [] });
    byKey.get(key)!.entries.push(h);
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(occ => ({
      date: occ.date,
      programId: occ.programId,
      sessionId: occ.sessionId,
      totalVolume: occ.entries.reduce((s, h) => s + h.weight * h.reps, 0),
      setsCount: occ.entries.length,
    }));
}

// ==============================
// User Detail Panel
// ==============================
interface UserData {
  programs: Program[];
  history: WorkoutHistory[];
  activeWorkout: unknown;
}

interface UserSummary {
  name: string | null;
  email: string | null;
  lastSeen: string | null;
  id: string;
  programCount: number;
  historyCount: number;
  hasActiveWorkout: boolean;
}

function UserDetailPanel({ userData, userName, users, selectedUser, sharing, onShare }: {
  userData: UserData;
  userName: string;
  users: UserSummary[];
  selectedUser: string;
  sharing: boolean;
  onShare: (programId: string, toUserId: string) => void;
}) {
  const [showAllPRs, setShowAllPRs] = useState(false);
  const { programs, history } = userData;

  const { forcePRs, myoPRs, timePRs } = useMemo(() => computePRs(history, programs), [history, programs]);
  const weeklyVolumeData = useMemo(() => computeWeeklyVolume(history, programs), [history, programs]);
  const lastSessions = useMemo(() => computeLastSessions(history), [history]);

  const allPRs = useMemo(() => [
    ...forcePRs.map(pr => ({ ...pr, _type: 'force' as const })),
    ...myoPRs.map(pr => ({ ...pr, _type: 'myo' as const })),
    ...timePRs.map(pr => ({ ...pr, _type: 'time' as const })),
  ].sort((a, b) => {
    if (a.isRecentPR && !b.isRecentPR) return -1;
    if (!a.isRecentPR && b.isRecentPR) return 1;
    return b.bestSetVolume - a.bestSetVolume || b.maxWeight - a.maxWeight;
  }), [forcePRs, myoPRs, timePRs]);

  const getSessionName = (programId: string, sessionId: string) => {
    const prog = programs.find(p => p.id === programId);
    const sess = prog?.sessions.find(s => s.id === sessionId);
    return sess?.name || sessionId.substring(0, 6) + '...';
  };

  const getProgramName = (programId: string) => {
    return programs.find(p => p.id === programId)?.name || programId.substring(0, 6) + '...';
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">
        Profil de <span className="text-primary">{userName}</span>
      </h2>

      {/* ===== DERNIÈRES SÉANCES ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Dernières séances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lastSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune séance enregistrée</p>
          ) : (
            lastSessions.map((sess, i) => (
              <motion.div
                key={`${sess.date}-${sess.sessionId}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{getSessionName(sess.programId, sess.sessionId)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 pl-5">
                    {getProgramName(sess.programId)} · {sess.setsCount} séries
                  </div>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <div className="text-xs font-semibold text-foreground">
                    {(sess.totalVolume / 1000).toFixed(1)}k kg
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {format(parseISO(sess.date), 'd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ===== VOLUME HEBDOMADAIRE ===== */}
      {weeklyVolumeData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Volume hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolumeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [`${value.toLocaleString()} kg`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Force" stackId="volume" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Myo" stackId="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== RECORDS PERSONNELS ===== */}
      {allPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Records personnels
              </CardTitle>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                PR cette semaine
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {allPRs
              .slice(0, showAllPRs ? undefined : 6)
              .map((pr) => (
                <div
                  key={`${pr._type}-${pr.exerciseName}`}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    pr.isRecentPR ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {pr.isRecentPR && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      pr._type === 'force' ? 'bg-green-500/20 text-green-400' :
                      pr._type === 'myo' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {pr._type === 'force' ? 'FORCE' : pr._type === 'myo' ? 'MYO' : 'TEMPS'}
                    </span>
                    <span className="font-medium text-sm truncate">{pr.exerciseName}</span>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    {pr._type === 'time' ? (
                      <span className="text-xs font-semibold text-blue-400">{formatDuration(pr.maxDuration)}</span>
                    ) : (
                      <span className={`text-xs font-semibold ${pr._type === 'force' ? 'text-green-400' : 'text-orange-400'}`}>
                        {pr.bestSetWeight}kg × {pr.bestSetReps}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            {allPRs.length > 6 && (
              <button
                onClick={() => setShowAllPRs(!showAllPRs)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors flex items-center justify-center gap-1"
              >
                {showAllPRs ? (
                  <><ChevronUp className="h-3 w-3" /> Voir moins</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Voir les {allPRs.length - 6} autres</>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== PROGRAMMES (partage) ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Programmes ({programs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun programme</p>
          ) : (
            programs.map((program, i) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-secondary/30 border border-transparent"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-medium text-sm">{program.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {users.filter(u => u.id !== selectedUser).map(targetUser => (
                      <Button
                        key={targetUser.id}
                        variant="outline"
                        size="sm"
                        disabled={sharing}
                        onClick={() => onShare(program.id, targetUser.id)}
                        title={`Partager à ${targetUser.name || targetUser.id.substring(0, 8)}`}
                        className="text-xs h-7"
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        {targetUser.name || targetUser.id.substring(0, 4) + '...'}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Active workout */}
      {userData.activeWorkout && (
        <p className="text-sm text-primary flex items-center gap-2">
          <span>🏋️</span> Entraînement en cours
        </p>
      )}
    </div>
  );
}

// ==============================
// Main Admin Page
// ==============================
export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!userLoading && user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, userLoading, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.isAdmin) fetchUsers();
  }, [user]);

  const viewUserData = async (userId: string) => {
    setSelectedUser(userId);
    setSelectedUserData(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/data`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserData(data);
      }
    } catch (e) {
      console.error('Failed to fetch user data:', e);
    }
  };

  const shareProgram = async (programId: string, toUserId: string) => {
    setSharing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/share-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ programId, fromUserId: selectedUser, toUserId }),
      });
      if (res.ok) {
        alert('Programme partagé !');
        fetchUsers();
      }
    } catch (e) {
      console.error('Failed to share program:', e);
    }
    setSharing(false);
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-1 bg-primary/50 rounded-full mx-auto animate-pulse" />
      </div>
    );
  }

  if (!user?.isAdmin) return null;

  const selectedUserName = users.find(u => u.id === selectedUser)?.name || (selectedUser ? selectedUser.substring(0, 8) + '...' : '');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Admin</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchUsers} className="ml-auto">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* Users List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Utilisateurs ({users.length})</h2>
            <div className="space-y-2">
              {users.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedUser === u.id
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-secondary/30 border-transparent hover:bg-secondary/50'
                  } ${u.id === currentUserId ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={() => viewUserData(u.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name || u.id.substring(0, 8) + '...'}</span>
                        {u.id === currentUserId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">MOI</span>
                        )}
                      </div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      <div className="text-sm text-muted-foreground mt-1">
                        {u.programCount} programmes · {u.historyCount} entrées
                        {u.hasActiveWorkout && ' · 🏋️ En cours'}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); viewUserData(u.id); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Selected User Detail */}
          <div>
            {selectedUser && selectedUserData ? (
              <motion.div
                key={selectedUser}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <UserDetailPanel
                  userData={selectedUserData}
                  userName={selectedUserName}
                  users={users}
                  selectedUser={selectedUser}
                  sharing={sharing}
                  onShare={shareProgram}
                />
              </motion.div>
            ) : selectedUser && !selectedUserData ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="w-6 h-1 bg-primary/50 rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Sélectionne un utilisateur pour voir ses données
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
