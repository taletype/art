"use client";

import { useEffect, useState } from "react";

interface AuctionCountdownProps {
  endsAt: string;
  className?: string;
}

export default function AuctionCountdown({ endsAt, className = "" }: AuctionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(endsAt).getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    // Calculate immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Set urgent if less than 1 hour remaining
      const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
      setIsUrgent(totalMinutes < 60);
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;

  if (totalSeconds <= 0) {
    return (
      <div className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}>
        <span className="text-white/60">Auction ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 text-xs sm:text-sm ${className}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? 'text-[#ff4757] animate-pulse' : 'text-white'}`}>
            {timeLeft.days}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? 'text-[#ff4757] animate-pulse' : 'text-white'}`}>
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Hrs</span>
      </div>
      <span className="text-white/30 text-sm sm:text-base">:</span>
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? 'text-[#ff4757] animate-pulse' : 'text-white'}`}>
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/45">Min</span>
      </div>
      <span className="text-white/30 text-sm sm:text-base">:</span>
      <div className="flex flex-col items-center">
        <span className={`font-mono text-sm sm:text-lg font-bold ${isUrgent ? 'text-[#ff4757] animate-pulse' : 'text-[#e8c547]'}`}>
          {String(timeLeft.seconds).padStart(2, '0')}
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
