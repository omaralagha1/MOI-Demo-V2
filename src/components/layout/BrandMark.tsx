/**
 * Neutral placeholder mark for the platform: an abstract sail over waves.
 * It is deliberately NOT a government emblem or coat of arms; replace it with approved identity assets when provided.
 */
export function BrandMark({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="kms-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#102B4E" />
          <stop offset="0.55" stopColor="#174A78" />
          <stop offset="1" stopColor="#087F8C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#kms-mark-gradient)" />
      <path d="M23.5 8.5v21.5H12.2z" fill="#fff" />
      <path d="M26 12.5 35.6 30H26z" fill="#fff" fillOpacity=".62" />
      <path d="M9.5 34.2c2.4-2.2 4.8-2.2 7.2 0s4.8 2.2 7.2 0 4.8-2.2 7.2 0 4.8 2.2 7.2 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M9.5 39.4c2.4-2.2 4.8-2.2 7.2 0s4.8 2.2 7.2 0 4.8-2.2 7.2 0 4.8 2.2 7.2 0" stroke="#6CC9D1" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
