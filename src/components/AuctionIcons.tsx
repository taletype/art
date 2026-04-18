export function HammerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 3L2 5.5L7 10.5L9.5 8L4.5 3Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M10.5 9L12 7.5L17 12.5L15.5 14L10.5 9Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
      <path
        d="M15.5 14L17 12.5L21 16.5L19.5 18L15.5 14Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      <path
        d="M19.5 18L21 16.5L22 17.5L20.5 19L19.5 18Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
    </svg>
  );
}

export function LotBadge({ lotNumber, className = "" }: { lotNumber: number; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-2 ${className}`}>
      <HammerIcon className="h-4 w-4 text-[#e8c547]" />
      <span className="text-sm font-semibold text-[#e8c547]">Lot {lotNumber}</span>
    </div>
  );
}

export function AuctionStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const getStatusColors = () => {
    switch (status.toLowerCase()) {
      case 'live':
        return 'border-[#e8c547]/40 bg-[#e8c547]/12 text-[#e8c547]';
      case 'upcoming':
        return 'border-white/20 bg-white/5 text-white/70';
      case 'closed':
      case 'settled':
        return 'border-white/10 bg-white/5 text-white/50';
      default:
        return 'border-white/10 bg-white/5 text-white/60';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusColors()} ${className}`}>
      {status.toLowerCase() === 'live' && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#e8c547] animate-pulse" />
      )}
      {status}
    </span>
  );
}
