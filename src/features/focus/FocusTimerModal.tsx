import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Square, Check, Flame, Sparkles } from 'lucide-react';
import { addFocusSession } from '@/db/focusSessionRepo';

export interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  topic?: string;
  initialMinutes?: number; // defaults to 45 mins
  onSessionComplete?: (minutes: number) => void;
}

export const FocusTimerModal: React.FC<FocusTimerProps> = ({
  isOpen,
  onClose,
  subject,
  topic = 'Focus Study Session',
  initialMinutes = 45,
  onSessionComplete,
}) => {
  const totalSeconds = initialMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer whenever modal opens with new inputs
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(initialMinutes * 60);
      setIsActive(true);
      setIsCompleted(false);
    }
  }, [isOpen, initialMinutes]);

  // Countdown effect
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    if (isActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinish(initialMinutes);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isActive, secondsRemaining, isCompleted, initialMinutes]);

  const handleFinish = async (completedMins?: number) => {
    setIsCompleted(true);
    setIsActive(false);
    const minsLogged = completedMins ?? Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60));

    try {
      await addFocusSession({
        subject,
        topic,
        durationMinutes: minsLogged,
        completedAt: new Date(),
      });
      if (onSessionComplete) {
        onSessionComplete(minsLogged);
      }
    } catch (err) {
      console.error('Failed to save focus session:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // SVG circular calculations
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const strokeDashoffset = circumference * (1 - progressRatio);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080E]/95 backdrop-blur-2xl text-white select-none"
      >
        <div className="flex flex-col h-full w-full max-w-[480px] p-6 relative justify-between">
          {/* Top Bar matching TimePad */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#181926] border border-[#27293D] flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer shadow-md active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-white tracking-tight">
                {subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                Focus
              </span>
            </div>

            <div className="w-10" />
          </div>

          {/* Topic Subtitle with Glowing Dot */}
          <div className="flex items-center justify-center gap-2 my-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_10px_#8B5CF6] animate-pulse" />
            <span className="text-[14px] font-medium text-gray-300 truncate max-w-[280px]">
              {topic}
            </span>
          </div>

          {/* Central Circular Progress Ring (TimePad Signature Design) */}
          <div className="flex flex-col items-center justify-center my-auto relative">
            <div className="relative w-[320px] h-[320px] flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 320 320">
                <defs>
                  <linearGradient id="timepadRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                  <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Track Ring */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="#181926"
                  strokeWidth="16"
                  className="transition-all"
                />

                {/* Glowing Progress Arc */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="url(#timepadRingGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#ringGlow)"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              {/* Time Display Inside Circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {!isCompleted ? (
                  <>
                    <motion.span
                      key={secondsRemaining}
                      initial={{ scale: 0.98, opacity: 0.9 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[52px] font-black tracking-tight text-white font-mono drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                    >
                      {formatTime(secondsRemaining)}
                    </motion.span>
                    <span className="text-[12px] font-semibold uppercase tracking-[2px] text-gray-400 mt-1 flex items-center gap-1.5">
                      <Flame size={14} className="text-[#8B5CF6]" />
                      {isActive ? 'Deep Study' : 'Paused'}
                    </span>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] mb-2 shadow-[0_0_24px_rgba(16,185,129,0.4)]">
                      <Check size={32} strokeWidth={3} />
                    </div>
                    <span className="text-[22px] font-bold text-white">Session Complete!</span>
                    <span className="text-[13px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                      <Sparkles size={14} /> +{initialMinutes} mins recorded
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Floating Control Buttons */}
          <div className="pb-8 pt-4">
            {!isCompleted ? (
              <div className="flex items-center justify-center gap-6">
                {/* Pause / Resume Button */}
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="w-16 h-16 rounded-full bg-[#1B1D2C] border border-[#2D3048] flex flex-col items-center justify-center text-white hover:bg-[#25283C] transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  {isActive ? (
                    <Pause size={22} className="text-gray-200" />
                  ) : (
                    <Play size={22} className="text-[#8B5CF6] ml-1" fill="#8B5CF6" />
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                    {isActive ? 'Pause' : 'Resume'}
                  </span>
                </button>

                {/* Finish / Quit Button */}
                <button
                  onClick={() => handleFinish()}
                  className="w-16 h-16 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] flex flex-col items-center justify-center text-white transition-all cursor-pointer shadow-[0_8px_24px_rgba(139,92,246,0.35)] active:scale-95"
                >
                  <Square size={20} fill="white" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/90 mt-1">
                    Finish
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-[15px] shadow-[0_8px_24px_rgba(139,92,246,0.4)] cursor-pointer transition-all active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
