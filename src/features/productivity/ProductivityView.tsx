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
} from 'lucide-react';
import {
  getFocusSessions,
  getWeeklyFocusStats,
  seedSampleFocusSessions,
  type DayFocusStat,
} from '@/db/focusSessionRepo';
import { db, type FocusSession } from '@/db/db';
import { FocusTimerModal } from '../focus/FocusTimerModal';

interface ProductivityViewProps {
  onStartTimer?: (subject: string, topic: string, mins?: number) => void;
}

export const ProductivityView: React.FC<ProductivityViewProps> = () => {
  const [activeRange, setActiveRange] = useState<'day' | 'week'>('week');
  const [stats, setStats] = useState<DayFocusStat[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [completedChecklistCount, setCompletedChecklistCount] = useState<number>(12);
  const [totalMinutes, setTotalMinutes] = useState<number>(226); // 3h 46m default

  // Focus Timer state
  const [selectedTimer, setSelectedTimer] = useState<{
    subject: string;
    topic: string;
    minutes: number;
  } | null>(null);

  const loadData = async () => {
    await seedSampleFocusSessions();
    const loadedSessions = await getFocusSessions();
    setSessions(loadedSessions);

    const weekly = await getWeeklyFocusStats();
    setStats(weekly);

    // Calculate total minutes from sessions
    const mins = loadedSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    setTotalMinutes(mins > 0 ? mins : 226);

    // Count completed checklist items from Notes
    try {
      const notes = await db.notes.toArray();
      let doneCount = 0;
      for (const n of notes) {
        if (n.checklist) {
          doneCount += n.checklist.filter((item) => item.done).length;
        }
      }
      setCompletedChecklistCount(doneCount > 0 ? doneCount + loadedSessions.length : 12);
    } catch {
      setCompletedChecklistCount(12);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Helper to get subject icon and color
  const getSubjectMeta = (subj: string) => {
    const lower = subj.toLowerCase();
    if (lower.includes('dbms') || lower.includes('database')) {
      return { icon: Database, bg: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30', color: '#8B5CF6' };
    }
    if (lower.includes('network') || lower.includes('cn')) {
      return { icon: Network, bg: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30', color: '#10B981' };
    }
    if (lower.includes('os') || lower.includes('system')) {
      return { icon: Cpu, bg: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30', color: '#EF4444' };
    }
    if (lower.includes('math')) {
      return { icon: Calculator, bg: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30', color: '#F59E0B' };
    }
    return { icon: BookOpen, bg: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30', color: '#3B82F6' };
  };

  // SVG Chart Geometry (5 points matching TimePad: Wed, Thu, Today, Sat, Sun)
  const chartHeight = 160;
  const points = stats.length >= 5
    ? stats.slice(0, 5).map((s, idx) => ({
        x: 20 + idx * 70,
        y: Math.max(25, 140 - Math.min(115, (s.minutes / 180) * 115)),
        label: s.dayLabel,
        minutes: s.minutes,
        isToday: s.isToday,
      }))
    : [
        { x: 20, y: 120, label: 'Wed', minutes: 40, isToday: false },
        { x: 90, y: 80, label: 'Thu', minutes: 75, isToday: false },
        { x: 160, y: 35, label: 'Today', minutes: 135, isToday: true },
        { x: 230, y: 100, label: 'Sat', minutes: 60, isToday: false },
        { x: 300, y: 125, label: 'Sun', minutes: 30, isToday: false },
      ];

  // SVG Cubic Bezier Spline Path
  const curvePath = `M ${points[0].x} ${points[0].y} ` +
    `C ${points[0].x + 35} ${points[0].y}, ${points[1].x - 35} ${points[1].y}, ${points[1].x} ${points[1].y} ` +
    `C ${points[1].x + 35} ${points[1].y}, ${points[2].x - 35} ${points[2].y}, ${points[2].x} ${points[2].y} ` +
    `C ${points[2].x + 35} ${points[2].y}, ${points[3].x - 35} ${points[3].y}, ${points[3].x} ${points[3].y} ` +
    `C ${points[3].x + 35} ${points[3].y}, ${points[4].x - 35} ${points[4].y}, ${points[4].x} ${points[4].y}`;

  const areaPath = `${curvePath} L ${points[4].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto px-4 pt-4 pb-24 text-white bg-[#0A0B10]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-black text-white tracking-tight flex items-center gap-2">
            My Productivity
            <Sparkles size={20} className="text-[#8B5CF6]" />
          </h1>
          <p className="text-[12px] text-gray-400 font-medium">
            Track study focus blocks, exams & syllabus mastery
          </p>
        </div>

        <button
          onClick={() =>
            setSelectedTimer({
              subject: 'DBMS Quiz',
              topic: 'ER Modeling & Relational Algebra',
              minutes: 45,
            })
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8B5CF6] text-white text-[12px] font-bold shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:bg-[#7C3AED] transition-all cursor-pointer active:scale-95"
        >
          <Play size={13} fill="white" /> Quick Focus
        </button>
      </div>

      {/* Top Stat Cards (TimePad 2-Column Layout) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Card 1: Task Completed */}
        <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center border border-[#10B981]/30">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-gray-300 leading-tight">
              Task Completed
            </span>
          </div>
          <div>
            <span className="text-[32px] font-black text-white tracking-tight">
              {completedChecklistCount}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              topics & sessions
            </span>
          </div>
        </div>

        {/* Card 2: Time Duration */}
        <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/30">
              <Clock size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-gray-300 leading-tight">
              Time Duration
            </span>
          </div>
          <div>
            <span className="text-[32px] font-black text-white tracking-tight">
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

      {/* Curved Spline Chart Card (Exact TimePad Aesthetic) */}
      <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] shadow-md mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 text-[12px] text-gray-400">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Flame size={14} className="text-[#8B5CF6]" /> Study Hours Trend
          </span>
          <span className="text-[11px] text-gray-400">Target: 3h/day</span>
        </div>

        {/* SVG Spline */}
        <div className="relative w-full h-[160px] flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 320 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.1" />
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
            <line x1="0" y1="40" x2="320" y2="40" stroke="#1E2235" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="320" y2="80" stroke="#1E2235" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="320" y2="120" stroke="#1E2235" strokeDasharray="3 3" />

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
            <circle
              cx={points[2].x}
              cy={points[2].y}
              r="8"
              fill="#8B5CF6"
              filter="url(#dotGlow)"
            />
            <circle
              cx={points[2].x}
              cy={points[2].y}
              r="4"
              fill="#FFFFFF"
            />
          </svg>
        </div>

        {/* X-Axis Day Labels */}
        <div className="flex justify-between px-2 pt-2 border-t border-[#1F2335] text-[11px] font-semibold text-gray-400">
          {points.map((p) => (
            <span
              key={p.label}
              className={p.isToday ? 'text-[#8B5CF6] font-bold scale-105' : 'text-gray-400'}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Focus Study Blocks (TimePad Task Card Style) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-white tracking-tight">
          Focus Tasks & Study Sessions
        </h2>
        <span className="text-[12px] text-gray-400">Tap ▶ to Focus</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {sessions.slice(0, 4).map((s, idx) => {
          const meta = getSubjectMeta(s.subject);
          const Icon = meta.icon;
          return (
            <div
              key={s.id ?? idx}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141622] border border-[#232738] shadow-sm hover:border-[#8B5CF6]/50 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-white truncate">
                    {s.topic || s.subject}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A78BFA]">
                      {s.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#10B981]/15 text-[#34D399]">
                      Focus
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-[12px] font-mono font-semibold text-gray-400">
                  00:{s.durationMinutes.toString().padStart(2, '0')}:00
                </span>
                <button
                  onClick={() =>
                    setSelectedTimer({
                      subject: s.subject,
                      topic: s.topic || 'Focus Study',
                      minutes: s.durationMinutes,
                    })
                  }
                  className="w-9 h-9 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(139,92,246,0.35)] transition-all cursor-pointer active:scale-90"
                >
                  <Play size={14} fill="white" className="ml-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
};
