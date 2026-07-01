"use client";

import { useEffect, useState } from "react";

interface AuctionCountdownProps {
  endsAt: string;
  className?: string;
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const EMPTY_TIME_LEFT: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function getTotalSeconds(timeLeft: TimeLeft) {
  return timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
}

function calculateTimeLeft(endsAt: string): TimeLeft {
  const endTime = new Date(endsAt).getTime();
  const difference = endTime - Date.now();

  if (!Number.isFinite(difference) || difference <= 0) {
    return EMPTY_TIME_LEFT;
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

function isWithinFinalHour(timeLeft: TimeLeft) {
  const totalSeconds = getTotalSeconds(timeLeft);
  return totalSeconds > 0 && totalSeconds < 3600;
}

export default function AuctionCountdown({ endsAt, className = "" }: AuctionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const newTimeLeft = calculateTimeLeft(endsAt);
      setTimeLeft(newTimeLeft);
      setIsUrgent(isWithinFinalHour(newTimeLeft));
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  if (!timeLeft) {
    return (
      <div className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}>
        <span className="font-mono text-sm font-bold text-white/45 sm:text-lg">--:--:--</span>
      </div>
    );
  }

  const totalSeconds = getTotalSeconds(timeLeft);

  if (totalSeconds <= 0) {
    return (
      <div className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}>
        <span className="text-white/60">Listing ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 text-xs sm:text-sm ${className}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? "text-[#ff4757] animate-pulse" : "text-white"}`}>
            {timeLeft.days}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? "text-[#ff4757] animate-pulse" : "text-white"}`}>
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Hrs</span>
      </div>
      <span className="text-white/30 text-sm sm:text-base">:</span>
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? "text-[#ff4757] animate-pulse" : "text-white"}`}>
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Min</span>
      </div>
      <span className="text-white/30 text-sm sm:text-base">:</span>
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? "text-[#ff4757] animate-pulse" : "text-[#e8c547]"}`}>
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Sec</span>
      </div>
      {isUrgent && (
        <span className="hidden sm:inline-flex ml-2 items-center gap-1.5 rounded-full border border-[#ff4757]/50 bg-[#ff4757]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff4757]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff4757] animate-pulse" />
          Ending soon
        </span>
      )}
    </div>
  );
}
