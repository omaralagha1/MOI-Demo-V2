/**
 * Original decorative illustration for the hero: nautical chart lines, a horizon with an abstract
 * Kuwait Towers silhouette, a traditional dhow and layered waves. Purely decorative (aria-hidden).
 */
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-chart" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#fff" strokeOpacity=".07">
          {[180, 300, 420, 540, 660, 780].map(r => <circle key={r} cx="1180" cy="120" r={r} />)}
          {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${i * 120} 0V640`} strokeDasharray="2 10" />)}
          {Array.from({ length: 6 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 120 + 40}H1440`} strokeDasharray="2 10" />)}
        </g>
        <g transform="translate(1180 120)" stroke="#fff" strokeOpacity=".16" fill="none">
          <circle r="54" />
          <circle r="40" strokeDasharray="3 5" />
          <path d="M0-74 8-8 0 0-8-8Z M0 74 8 8 0 0-8 8Z M-74 0-8 8 0 0-8-8Z M74 0 8 8 0 0 8-8Z" fill="#fff" fillOpacity=".1" />
        </g>
      </svg>
      <svg className="hero-horizon" viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="hero-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#fff" strokeLinecap="round" fill="none">
          {/* Abstract Kuwait Towers silhouette */}
          <g strokeOpacity=".5" strokeWidth="3">
            <path d="M1160 168V28" />
            <path d="M1203 168V78" />
            <path d="M1232 168V104" strokeWidth="2.4" />
          </g>
          <g fill="#fff" fillOpacity=".16" strokeOpacity=".55" strokeWidth="1.5">
            <circle cx="1160" cy="100" r="25" />
            <circle cx="1160" cy="58" r="12" />
            <circle cx="1203" cy="116" r="18" />
          </g>
          <g strokeOpacity=".22" strokeWidth="1">
            <path d="M1135 100h50M1137 92h46M1137 108h46M1191 116h24" />
          </g>
          {/* Dhow */}
          <g strokeOpacity=".55" strokeWidth="2">
            <path d="M232 176c38 14 108 14 150-6l8-12H222z" fill="#fff" fillOpacity=".14" />
            <path d="M300 158V46" />
            <path d="M246 92 352 34" strokeWidth="1.6" />
            <path d="M246 92 352 34 318 152Z" fill="#fff" fillOpacity=".12" strokeWidth="1.4" />
            <path d="M226 158 210 144" strokeWidth="1.6" />
          </g>
          {/* Horizon and waves */}
          <path d="M0 168H1440" strokeOpacity=".22" strokeWidth="1" />
          <path d="M0 186c60-10 120-10 180 0s120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0 120 10 180 0" strokeOpacity=".22" strokeWidth="2" />
          <path d="M-90 206c60-10 120-10 180 0s120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0" strokeOpacity=".14" strokeWidth="2" />
        </g>
        <rect y="168" width="1440" height="72" fill="url(#hero-sea)" />
      </svg>
    </div>
  );
}
