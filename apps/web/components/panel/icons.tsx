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
/** Heating and cooling: a thermometer with a hot and a cold tick. */
export const ThermostatIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M8 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z" /><path d="M16 5h4M16 9h2.5M16 13h4" /></svg>
);
/** LED strip: a bar of LEDs with a soft glow below. */
export const LedStripIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <rect x="2.5" y="7" width="19" height="6" rx="3" />
    <path d="M7.5 10h.01M12 10h.01M16.5 10h.01" />
    <path d="M7 16.5v2M12 16.5v3M17 16.5v2" />
  </svg>
);
/** Recessed ceiling light: a downlight sitting in the ceiling, casting a cone of light. */
export const DownlightIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M3 5h18" />
    <path d="M8 5v2.5h8V5" />
    <path d="M8 7.5 5.5 12.5h13L16 7.5" />
    <path d="M8 16.5v2.5M12 16v3.5M16 16.5v2.5" />
  </svg>
);
/** Hanging pendant lamp with a rounded, woven-looking shade. */
export const PendantIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v3.5M10 6.5h4" />
    <path d="M10 6.5C6 9.5 5 14 7.5 17.8c1.8 2.4 7.2 2.4 9 0C19 14 18 9.5 14 6.5" />
    <path d="M6.6 12.8c3.3 1.4 6.5 1.4 10.8 0M8 16.2c2.4.9 5.6.9 8 0" />
  </svg>
);
/** Surface-mounted round ceiling panel (plafón): a flat disc on the ceiling, light spreading down. */
export const PlafonIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M3 4.5h18" />
    <rect x="4.5" y="7" width="15" height="4" rx="2" />
    <path d="M7.5 15l-1.5 3M12 15v3.5M16.5 15l1.5 3" />
  </svg>
);
export const FanIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4C11 6 12.5 3 15 3.5s2.2 4-1.4 7.2M13.4 12.8c3.9 2.2 5.4 5.2 3.6 7s-4.6-.6-5.3-5.3M10.6 12.6C6.4 14 3.5 12.8 3.6 10.3s3.8-3.2 7.4.4" /></svg>
);
export const PlugIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v5" /></svg>
);

export const LockIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const LockOpenIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></svg>
);

export const CameraIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M4 8a2 2 0 0 1 2-2h1.5l1.2-1.6h6.6L16.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" /><circle cx="12" cy="12.5" r="3.2" /></svg>
);
export const ChevronUpIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="m6 15 6-6 6 6" /></svg>
);
export const ChevronDownIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="m6 9 6 6 6-6" /></svg>
);
export const StopIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="6.5" y="6.5" width="11" height="11" rx="2" /></svg>
);
export const CloseIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const SunIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
);
export const MoonIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></svg>
);
export const AutoThemeIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></svg>
);

/** Weather glyphs, keyed by HA condition. Larger strokes, two tones. */
export function WeatherIcon({ condition, size = 56 }: { condition: string; size?: number }) {
  const sun = "var(--sun)";
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

export const MinusIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M5 12h14" /></svg>
);
export const PlusIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const PowerIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3v8M6.4 6.4a8 8 0 1 0 11.2 0" /></svg>
);
export const FlameIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8.5-.5 2-1.5 3-2.5 3.5C12 7 11 5 9.5 3 9.5 7 6 9.5 6 15a6 6 0 0 0 6 6z" /></svg>
);
export const LeafIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7" /></svg>
);
export const AwayIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M3 11l9-7 9 7M5 10v10h5M14 20h2a4 4 0 0 0 0-8h-1M17 9.5V6" /><path d="M16 16l3 3M19 16l-3 3" /></svg>
);

/** A two-storey house with the given storey highlighted (0 = ground floor). */
export const FloorIcon = ({ storey, size = 18 }: P & { storey: number }) => (
  <svg {...base(size)}>
    <path d="M3.5 10.5 12 4l8.5 6.5" />
    <path d="M5.5 9v11h13V9" />
    <path d="M5.5 14.5h13" />
    <rect x="5.5" y={storey === 0 ? 14.5 : 9.2} width="13" height={storey === 0 ? 5.5 : 5.3} fill="currentColor" opacity="0.35" stroke="none" />
  </svg>
);
/** House with a fence in front: "outside the house". */
export const GardenIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 11 12 4l8 7" />
    <path d="M7 9.5V13M17 9.5V13" />
    <path d="M4.5 21v-5M10 21v-5M14 21v-5M19.5 21v-5M3 18h18" />
  </svg>
);

export const HomeIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" /></svg>
);
export const SunsetIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M7 17a5 5 0 0 1 10 0M3 17h2M19 17h2M12 8V4M5.6 10.6 4.2 9.2M18.4 10.6l1.4-1.4M3 21h18M9.5 6 12 3.5 14.5 6" /></svg>
);
export const AwayDoorIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M13 4H6v16h7M10 12h11M18 9l3 3-3 3" /></svg>
);
export const SuitcaseIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V4.5h6V7M9 11v5M15 11v5" /></svg>
);
export const GuestsIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5M17.5 14.5a5.5 5.5 0 0 1 3 4.5" /></svg>
);

export const MusicIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);
export const SpeakerIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="14" r="3" /><path d="M12 7h.01" strokeWidth={2.5} /></svg>
);
export const PlayIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
);
export const PauseIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M8 5v14M16 5v14" strokeWidth={3} /></svg>
);
export const NextIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M6 6l9 6-9 6z" fill="currentColor" /><path d="M18 6v12" strokeWidth={2.2} /></svg>
);
export const PrevIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M18 6l-9 6 9 6z" fill="currentColor" /><path d="M6 6v12" strokeWidth={2.2} /></svg>
);
export const RadioIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8l10-4M15 14h2M7 14a2 2 0 1 0 4 0 2 2 0 0 0-4 0" /></svg>
);
export const SearchIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
);
