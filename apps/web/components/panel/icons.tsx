type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
});

export const BulbIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>
);
export const BlindIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M4 4h16M5 4v12h14V4M5 8h14M5 12h14M12 16v3" /></svg>
);
export const TvIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20h8" /></svg>
);
export const TempIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z" /></svg>
);
export const FanIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4C11 6 12.5 3 15 3.5s2.2 4-1.4 7.2M13.4 12.8c3.9 2.2 5.4 5.2 3.6 7s-4.6-.6-5.3-5.3M10.6 12.6C6.4 14 3.5 12.8 3.6 10.3s3.8-3.2 7.4.4" /></svg>
);
export const PlugIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v5" /></svg>
);

/** Weather glyphs, keyed by HA condition. Larger strokes, two tones. */
export function WeatherIcon({ condition, size = 56 }: { condition: string; size?: number }) {
  const sun = "var(--accent)";
  const cloud = "var(--text-2)";
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const cloudPath = "M8 19h9a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.4 1.6A2.8 2.8 0 0 0 8 19z";

  switch (condition) {
    case "sunny":
      return <svg {...p} stroke={sun}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>;
    case "clear-night":
      return <svg {...p} stroke={sun}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></svg>;
    case "partlycloudy":
      return (
        <svg {...p} stroke={sun}>
          <circle cx="9" cy="9" r="3.2" /><path d="M9 2.5v1.3M3.7 4.7l.9.9M2.5 9h1.3M14.3 4.7l-.9.9" />
          <path d={cloudPath} stroke={cloud} fill="var(--surface)" />
        </svg>
      );
    case "rainy":
    case "pouring":
    case "lightning-rainy":
      return <svg {...p} stroke={cloud}><path d="M7 15h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.4 1.6A2.8 2.8 0 0 0 7 15z" /><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" stroke="var(--info)" /></svg>;
    case "snowy":
    case "snowy-rainy":
      return <svg {...p} stroke={cloud}><path d="M7 15h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.4 1.6A2.8 2.8 0 0 0 7 15z" /><path d="M9 19h.01M12 20.5h.01M15 19h.01" strokeWidth={2.5} /></svg>;
    case "fog":
      return <svg {...p} stroke={cloud}><path d="M4 9h16M3 13h18M5 17h14" /></svg>;
    case "lightning":
      return <svg {...p} stroke={cloud}><path d="M7 15h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.4 1.6A2.8 2.8 0 0 0 7 15z" /><path d="M12.5 15l-2 3.5h3l-2 3.5" stroke={sun} /></svg>;
    default:
      return <svg {...p} stroke={cloud}><path d={cloudPath} /></svg>;
  }
}
