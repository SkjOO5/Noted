import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  BookOpen,
  Database,
  Network,
  Cpu,
  Calculator,
  Flame,
  Plus,
  Trash2,
  Target,
} from 'lucide-react';
import {
  getFocusSessions,
  getWeeklyFocusStats,
  cleanDemoFocusSessions,
  deleteFocusSession,
  type DayFocusStat,
} from '@/db/focusSessionRepo';
import { getAllEvents } from '@/db/eventRepo';
import { getAllNotes } from '@/db/noteRepo';
import { type FocusSession } from '@/db/db';
import { FocusTimerModal } from '../focus/FocusTimerModal';

interface RealStudyTask {
  id: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  source: 'calendar' | 'checklist' | 'custom';
}

export const ProductivityView: React.FC = () => {
  const [activeRange, setActiveRange] = useState<'day' | 'week'>('week');
  const [stats, setStats] = useState<DayFocusStat[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [studyTasks, setStudyTasks] = useState<RealStudyTask[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalMinutes, setTotalMinutes] = useState<number>(0);

  // Quick Focus / Custom Timer modal
  const [selectedTimer, setSelectedTimer] = useState<{
    subject: string;
    topic: string;
    minutes: number;
  } | null>(null);

  // Custom session creation sheet state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [customDuration, setCustomDuration] = useState<number>(25);

  const loadData = async () => {
    // 1. Purge any leftover demo mock data
    await cleanDemoFocusSessions();

    // 2. Fetch real completed sessions
    const loadedSessions = await getFocusSessions();
    setSessions(loadedSessions);

    // 3. Compute stats
    const totalMins = loadedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    setTotalMinutes(totalMins);
    setCompletedCount(loadedSessions.length);

    // 4. Fetch weekly stats
    const weekly = await getWeeklyFocusStats();
    setStats(weekly);

    // 5. Fetch real tasks from Calendar events and Note checklists
    const tasks: RealStudyTask[] = [];

    try {
      // Upcoming events (quizzes, exams, assignments, study blocks)
      const allEvents = await getAllEvents();
      const relevantEvents = allEvents.filter(
        (e) => !e.isDone && ['quiz', 'exam', 'assignment', 'deadline', 'study'].includes(e.type)
      );

      for (const ev of relevantEvents.slice(0, 5)) {
        tasks.push({
          id: `event-${ev.id}`,
          subject: ev.subject || (ev.type.charAt(0).toUpperCase() + ev.type.slice(1)),
          topic: ev.title,
          durationMinutes: 45,
          source: 'calendar',
        });
      }

      // Notes checklist items
      const allNotes = await getAllNotes();
      for (const n of allNotes) {
        if (n.checklist) {
          for (const item of n.checklist) {
            if (!item.done && tasks.length < 8) {
              tasks.push({
                id: `note-${n.id}-${item.text.slice(0, 10)}`,
                subject: n.subject || 'Study Topic',
                topic: item.text,
                durationMinutes: 25,
                source: 'checklist',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error loading real study tasks:', err);
    }

    setStudyTasks(tasks);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteSession = async (id?: number) => {
    if (!id) return;
    await deleteFocusSession(id);
    await loadData();
  };

  const handleStartCustomSession = (e: React.FormEvent) => {
    e.preventDefault();
    const subj = customSubject.trim() || 'General Study';
    const top = customTopic.trim() || 'Focus Session';
    setIsCustomModalOpen(false);
    setSelectedTimer({
      subject: subj,
      topic: top,
      minutes: customDuration,
    });
    setCustomSubject('');
    setCustomTopic('');
  };

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Helper for subject icon and theme
  const getSubjectMeta = (subj: string) => {
    const lower = (subj || '').toLowerCase();
    if (lower.includes('dbms') || lower.includes('database')) {
      return { icon: Database, bg: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30' };
    }
    if (lower.includes('network') || lower.includes('cn')) {
      return { icon: Network, bg: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30' };
    }
    if (lower.includes('os') || lower.includes('system') || lower.includes('operating')) {
      return { icon: Cpu, bg: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30' };
    }
    if (lower.includes('math') || lower.includes('discrete') || lower.includes('algebra')) {
      return { icon: Calculator, bg: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30' };
    }
    return { icon: BookOpen, bg: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30' };
  };

  // Today's focus minutes
  const todayMinutes = stats.find((s) => s.isToday)?.minutes || 0;
  const targetMinutes = 180; // 3 hours
  const todayProgress = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100));

  // Safe SVG Chart Points for 7 days
  const chartHeight = 140;
  const maxDayMinutes = Math.max(120, ...stats.map((s) => s.minutes || 0));

  const displayPoints = stats.length > 0
    ? stats.slice(-5).map((s, idx) => {
        const x = 30 + idx * 65;
        const ratio = Math.max(0, Math.min(1, (s.minutes || 0) / maxDayMinutes));
        const y = Math.round(120 - ratio * 90);
        return {
          x,
          y,
          label: s.dayLabel,
          minutes: s.minutes || 0,
          isToday: s.isToday,
        };
      })
    : [
        { x: 30, y: 110, label: 'Mon', minutes: 0, isToday: false },
        { x: 95, y: 110, label: 'Tue', minutes: 0, isToday: false },
        { x: 160, y: 110, label: 'Today', minutes: 0, isToday: true },
        { x: 225, y: 110, label: 'Thu', minutes: 0, isToday: false },
        { x: 290, y: 110, label: 'Fri', minutes: 0, isToday: false },
      ];

  // SVG Spline Path
  const curvePath = displayPoints.length >= 2
    ? `M ${displayPoints[0].x} ${displayPoints[0].y} ` +
      displayPoints.slice(1).map((p, i) => {
        const prev = displayPoints[i];
        const cpX = (prev.x + p.x) / 2;
        return `C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
      }).join(' ')
    : `M 30 110 L 290 110`;

  const lastPoint = displayPoints[displayPoints.length - 1];
  const firstPoint = displayPoints[0];
  const areaPath = `${curvePath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`;

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto overflow-x-hidden px-4 pt-4 pb-24 text-white bg-[#0A0B10]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5 w-full">
        <div className="min-w-0 pr-2">
          <h1 className="text-[22px] font-black text-white tracking-tight flex items-center gap-2 truncate">
            My Productivity
            <Sparkles size={18} className="text-[#8B5CF6] shrink-0" />
          </h1>
          <p className="text-[12px] text-gray-400 font-medium truncate">
            Focus sessions & syllabus study mastery
          </p>
        </div>

        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8B5CF6] text-white text-[12px] font-bold shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:bg-[#7C3AED] transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Play size={13} fill="white" /> Quick Focus
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 w-full">
        {/* Card 1: Completed Sessions */}
        <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center border border-[#10B981]/30 shrink-0">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-gray-300 leading-tight">
              Sessions
            </span>
          </div>
          <div>
            <span className="text-[28px] font-black text-white tracking-tight">
              {completedCount}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              completed
            </span>
          </div>
        </div>

        {/* Card 2: Time Studied */}
        <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/30 shrink-0">
              <Clock size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-gray-300 leading-tight">
              Time Studied
            </span>
          </div>
          <div>
            <span className="text-[28px] font-black text-white tracking-tight">
              {formatHoursMins(totalMinutes)}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              focused study
            </span>
          </div>
        </div>
      </div>

      {/* Range Toggle (Day / Week) */}
      <div className="flex justify-center mb-4">
        <div className="flex p-1 rounded-full bg-[#141622] border border-[#232738]">
          <button
            onClick={() => setActiveRange('day')}
            className={`px-6 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              activeRange === 'day'
                ? 'bg-[#8B5CF6] text-white shadow-[0_2px_12px_rgba(139,92,246,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setActiveRange('week')}
            className={`px-6 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              activeRange === 'week'
                ? 'bg-[#8B5CF6] text-white shadow-[0_2px_12px_rgba(139,92,246,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Chart / Day View Card */}
      <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md mb-6 relative overflow-hidden w-full">
        <div className="flex items-center justify-between mb-3 text-[12px] text-gray-400">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Flame size={14} className="text-[#8B5CF6]" />
            {activeRange === 'day' ? "Today's Study Progress" : 'Weekly Study Trend'}
          </span>
          <span className="text-[11px] text-gray-400">Target: 3h/day</span>
        </div>

        {activeRange === 'day' ? (
          /* Day View: Today's Progress Bar & Metrics */
          <div className="py-2 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[26px] font-black text-white">
                  {formatHoursMins(todayMinutes)}
                </span>
                <span className="text-[12px] text-gray-400 ml-1.5">
                  / 3h 0m target
                </span>
              </div>
              <span className="text-[13px] font-bold text-[#8B5CF6]">
                {todayProgress}%
              </span>
            </div>

            {/* Glowing progress bar */}
            <div className="w-full h-3 rounded-full bg-[#1F2335] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] transition-all duration-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                style={{ width: `${Math.max(4, todayProgress)}%` }}
              />
            </div>

            <p className="text-[11px] text-gray-400 mt-1">
              {todayMinutes === 0
                ? 'No study sessions recorded today yet. Launch a timer to start tracking!'
                : todayProgress >= 100
                ? '🔥 Outstanding! You hit your 3-hour daily target!'
                : `${formatHoursMins(targetMinutes - todayMinutes)} remaining to reach your goal.`}
            </p>
          </div>
        ) : (
          /* Week View: Smooth SVG Spline Chart */
          <div>
            <div className="relative w-full" style={{ height: '140px' }}>
              <svg className="w-full h-full" viewBox="0 0 320 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                  <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Horizontal Grid Guidelines */}
                <line x1="0" y1="35" x2="320" y2="35" stroke="#1E2235" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="320" y2="75" stroke="#1E2235" strokeDasharray="3 3" />
                <line x1="0" y1="115" x2="320" y2="115" stroke="#1E2235" strokeDasharray="3 3" />

                {/* Area Fill */}
                <path d={areaPath} fill="url(#areaGradient)" />

                {/* Smooth Spline Curve */}
                <path
                  d={curvePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Glowing Focus Dot on Today */}
                {displayPoints.find((p) => p.isToday) && (
                  (() => {
                    const tp = displayPoints.find((p) => p.isToday)!;
                    return (
                      <g key="today-dot">
                        <circle
                          cx={tp.x}
                          cy={tp.y}
                          r="7"
                          fill="#8B5CF6"
                          filter="url(#dotGlow)"
                        />
                        <circle cx={tp.x} cy={tp.y} r="3.5" fill="#FFFFFF" />
                      </g>
                    );
                  })()
                )}
              </svg>
            </div>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between px-2 pt-2 border-t border-[#1F2335] text-[11px] font-semibold text-gray-400">
              {displayPoints.map((p, i) => (
                <span
                  key={i}
                  className={p.isToday ? 'text-[#8B5CF6] font-bold' : 'text-gray-400'}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Focus Tasks & Study Sessions Section */}
      <div className="flex items-center justify-between mb-3 w-full">
        <div>
          <h2 className="text-[16px] font-bold text-white tracking-tight">
            Study Tasks & Upcoming Topics
          </h2>
          <span className="text-[11px] text-gray-400">
            {studyTasks.length > 0 ? 'From your calendar and notes' : 'Tap + to start a session'}
          </span>
        </div>

        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1 text-[12px] font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>New</span>
        </button>
      </div>

      {studyTasks.length === 0 ? (
        /* Empty State */
        <div className="p-5 rounded-2xl bg-[#141622] border border-[#232738] text-center mb-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/20">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white">No active study tasks</p>
            <p className="text-[12px] text-gray-400 mt-1 max-w-[280px]">
              Create a custom focus session or add exam/quiz notices from your Messages or Calendar.
            </p>
          </div>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[12px] font-bold shadow-md transition-all cursor-pointer"
          >
            + Start Focus Session
          </button>
        </div>
      ) : (
        /* Real Study Tasks List */
        <div className="flex flex-col gap-2.5 mb-6">
          {studyTasks.map((task) => {
            const meta = getSubjectMeta(task.subject);
            const Icon = meta.icon;
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141622] border border-[#232738] shadow-sm hover:border-[#8B5CF6]/50 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-white truncate">
                      {task.topic}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A78BFA] truncate max-w-[120px]">
                        {task.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#10B981]/15 text-[#34D399] shrink-0">
                        {task.durationMinutes}m
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setSelectedTimer({
                      subject: task.subject,
                      topic: task.topic,
                      minutes: task.durationMinutes,
                    })
                  }
                  title="Start Focus Timer"
                  className="w-9 h-9 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(139,92,246,0.35)] transition-all cursor-pointer shrink-0 active:scale-90"
                >
                  <Play size={14} fill="white" className="ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Sessions Log */}
      {sessions.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-white tracking-tight">
              Completed Focus Log
            </h2>
            <span className="text-[11px] text-gray-400">
              {sessions.length} recorded
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {sessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#141622]/80 border border-[#232738] text-[13px]"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-white truncate">{s.topic || s.subject}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {s.subject} • {new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#10B981]/15 text-[#34D399]">
                    +{s.durationMinutes}m
                  </span>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Active Focus Timer Modal */}
      {selectedTimer && (
        <FocusTimerModal
          isOpen={!!selectedTimer}
          onClose={() => {
            setSelectedTimer(null);
            loadData();
          }}
          subject={selectedTimer.subject}
          topic={selectedTimer.topic}
          initialMinutes={selectedTimer.minutes}
          onSessionComplete={() => {
            loadData();
          }}
        />
      )}

      {/* Quick Focus / Custom Timer Creation Sheet */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-[420px] bg-[#141622] border border-[#27293D] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <Flame size={18} className="text-[#8B5CF6]" /> Start Focus Session
              </h3>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-gray-400 hover:text-white text-[13px] font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleStartCustomSession} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. DBMS, Operating Systems, Math..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0B10] border border-[#27293D] text-white text-[13px] focus:border-[#8B5CF6] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Topic / Goal (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 3 Review, Practice Questions..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0B10] border border-[#27293D] text-white text-[13px] focus:border-[#8B5CF6] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1.5">
                  Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCustomDuration(mins)}
                      className={`py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                        customDuration === mins
                          ? 'bg-[#8B5CF6] text-white border-transparent shadow-[0_2px_10px_rgba(139,92,246,0.4)]'
                          : 'bg-[#0A0B10] text-gray-400 border-[#27293D] hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-[14px] shadow-[0_4px_16px_rgba(139,92,246,0.35)] transition-all cursor-pointer active:scale-98"
              >
                Launch Timer ({customDuration}m)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
