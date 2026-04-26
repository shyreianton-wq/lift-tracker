import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWorkout } from '@/contexts/WorkoutContext';

// Simple markdown renderer
function renderMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1 text-foreground">$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1 text-foreground">$2</h2>'.replace('$2', '$1'))
    // H1
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1 text-foreground">$1</h1>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Wrap consecutive li in ul
    .replace(/(<li.*<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`)
    // Newlines to <br>
    .replace(/\n/g, '<br>');
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const QUICK_ACTIONS = [
  { label: '📊 Analyse ma dernière séance', prompt: 'analyse_last' },
  { label: '💪 Suggestions pour progresser', prompt: 'suggestions' },
  { label: '📈 Résumé de ma semaine', prompt: 'weekly_summary' },
  { label: '🔄 Ajustement de programme', prompt: 'adjust_program' },
];

export default function Coach() {
  const navigate = useNavigate();
  const { history, programs } = useWorkout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingContent, setTypingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingContent]);

  // Build user context to inject
  const buildContext = useCallback(() => {
    // Compute PRs
    const prs: Record<string, string> = {};
    for (const h of history) {
      if (h.weight && h.weight > 0) {
        const key = h.exerciseId;
        const exerciseName = (() => {
          for (const p of programs) {
            for (const s of p.sessions) {
              for (const e of s.exercises) {
                if (e.id === key) return e.name;
                if (p.rotationGroups) {
                  for (const rg of p.rotationGroups) {
                    for (const re of rg.exercises) {
                      if (re.id === key) return re.name;
                    }
                  }
                }
              }
            }
          }
          return null;
        })();
        if (exerciseName) {
          const current = prs[exerciseName];
          if (!current || h.weight > parseFloat(current)) {
            prs[exerciseName] = `${h.weight}kg x${h.reps}`;
          }
        }
      }
    }
    return { history, programs, prs };
  }, [history, programs]);

  // Format user prompt with context for quick actions
  const buildPrompt = useCallback((actionKey: string): string => {
    const recentHistory = history.slice(-30);
    const recentByDate: Record<string, typeof history> = {};
    for (const h of recentHistory) {
      const date = h.completedAt ? h.completedAt.split('T')[0] : '?';
      if (!recentByDate[date]) recentByDate[date] = [];
      recentByDate[date].push(h);
    }

    const dateLines = Object.entries(recentByDate)
      .slice(-7)
      .map(([date, sets]) => {
        const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
        const exerciseNames = exerciseIds.map(eid => {
          for (const p of programs) {
            for (const s of p.sessions) {
              for (const e of s.exercises) {
                if (e.id === eid) return e.name;
              }
            }
            for (const rg of p.rotationGroups || []) {
              for (const re of rg.exercises) {
                if (re.id === eid) return re.name;
              }
            }
          }
          return null;
        }).filter(Boolean);
        return `  - ${date}: ${sets.length} sets (${exerciseNames.slice(0, 4).join(', ')}${exerciseNames.length > 4 ? '...' : ''})`;
      }).join('\n');

    const programNames = programs.map(p => p.name).join(', ') || 'aucun';

    const contextBlock = `
[Contexte utilisateur]
Programmes: ${programNames}
Séances récentes:
${dateLines || '  - Aucune séance récente'}
Total sets historique: ${history.length}
`;

    switch (actionKey) {
      case 'analyse_last':
        return `${contextBlock}\nAnalyse ma dernière séance et dis-moi comment je m'en suis sorti. Points positifs et axes d'amélioration.`;
      case 'suggestions':
        return `${contextBlock}\nBasé sur mon historique, quelles suggestions concrètes as-tu pour que je progresse ? Propose des poids/reps pour ma prochaine séance.`;
      case 'weekly_summary':
        return `${contextBlock}\nFais-moi un résumé de ma semaine d'entraînement. Volume total, fréquence, équilibre musculaire.`;
      case 'adjust_program':
        return `${contextBlock}\nAnalyse mes programmes et mon historique. Propose des ajustements concrets (exercices, volumes, fréquence) pour optimiser mes résultats.`;
      default:
        return '';
    }
  }, [history, programs]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { id: generateId(), role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setTypingContent('');

    const context = buildContext();
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        const errMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `❌ Erreur : ${err.error || 'Réponse invalide du serveur'}`,
        };
        setMessages(prev => [...prev, errMsg]);
        setIsLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                setTypingContent(fullContent);
              }
            } catch (_) {}
          }
        }
      }

      const assistantMsg: Message = { id: generateId(), role: 'assistant', content: fullContent };
      setMessages(prev => [...prev, assistantMsg]);
      setTypingContent('');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        const errMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: '❌ Erreur de connexion au coach IA.',
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } finally {
      setIsLoading(false);
      setTypingContent('');
    }
  }, [messages, isLoading, buildContext]);

  const handleQuickAction = useCallback((actionKey: string) => {
    const prompt = buildPrompt(actionKey);
    if (prompt) sendMessage(prompt);
  }, [buildPrompt, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl btn-primary-gradient flex items-center justify-center glow-primary">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coach IA 🏋️</h1>
                <p className="text-xs text-muted-foreground">Llama 3.3 70B • Powered by Groq</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 container py-4 overflow-y-auto">
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-3xl btn-primary-gradient flex items-center justify-center mx-auto mb-4 glow-primary">
              <Bot className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Coach IA 🏋️</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Pose-moi une question sur tes entraînements ou utilise les boutons rapides ci-dessous.
            </p>
          </motion.div>
        )}

        <div className="space-y-4 pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  msg.role === 'assistant'
                    ? 'btn-primary-gradient glow-primary'
                    : 'bg-secondary'
                }`}>
                  {msg.role === 'assistant' ? (
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-foreground" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-secondary text-foreground rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      className="prose prose-sm max-w-none"
                    />
                  ) : (
                    // For user messages, show the display version (without context block)
                    <p className="whitespace-pre-wrap">
                      {msg.content.includes('[Contexte utilisateur]')
                        ? msg.content.split('\n').filter(l => !l.startsWith('[Contexte') && !l.startsWith('  -') && !l.startsWith('Programmes:') && !l.startsWith('Séances') && !l.startsWith('Total')).join('\n').replace(/^\n+/, '')
                        : msg.content}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 flex-row"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full btn-primary-gradient glow-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-secondary text-foreground">
                {typingContent ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(typingContent) }}
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <div className="border-t border-border bg-background/95 backdrop-blur-lg">
        <div className="container py-3">
          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.prompt}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                  className="text-xs px-3 py-2 rounded-full border border-border bg-secondary hover:bg-primary/10 hover:border-primary/50 text-foreground transition-colors disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose une question au coach..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 min-h-[44px] max-h-32 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="h-11 w-11 p-0 btn-primary-gradient glow-primary flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
