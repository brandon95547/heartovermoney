// The heart-over-dollar mark. A stand-in drawn to match the business plan's cover until the
// client's logo files arrive; `reversed` draws it white for dark backgrounds.
export function Logo({ size = 40, reversed = false, className = "" }: { size?: number; reversed?: boolean; className?: string }) {
  const fill = reversed ? "#fff" : "#111";
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 62 100" role="img" aria-label="Heart Over Money" className={className}>
      <path fill={fill} d="M31 40 C10 26 2 18 2 10.5 C2 4.5 6.8 0 12.6 0 C19 0 25 4 31 11 C37 4 43 0 49.4 0 C55.2 0 60 4.5 60 10.5 C60 18 52 26 31 40 Z" />
      <text x="31" y="96" fill={fill} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="58" textAnchor="middle">$</text>
    </svg>
  );
}
