/**
 * Category-specific icons for bathroom product categories.
 * Uses lucide-react where available, inline SVG for the rest.
 */

import {
  Toilet,
  ShowerHead,
  Bath,
  GlassWater,
  Package,
  SprayCan,
  Layers,
} from "lucide-react";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

// ─── Inline SVG icons for categories not in lucide ───────────────────────────

function Sink({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* countertop */}
      <path d="M2 9h20" />
      {/* basin bowl (U-shape) */}
      <path d="M7 9v5a5 5 0 0 0 10 0V9" />
      {/* drain */}
      <circle cx="12" cy="15" r="1" />
      {/* faucet riser */}
      <path d="M12 9V5" />
      {/* faucet crossbar */}
      <path d="M9.5 5h5" />
    </svg>
  );
}

function Faucet({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* inlet pipe vertical */}
      <path d="M9 20v-7" />
      {/* body T-connector */}
      <path d="M6 13h6" />
      {/* horizontal arm */}
      <path d="M12 13v-3h5v3" />
      {/* spout drop */}
      <path d="M17 13v3" />
      {/* handle lever */}
      <path d="M8 10h4" />
      <path d="M10 10V8" />
      {/* water drop */}
      <path d="M17 16v1.5" strokeWidth="2" />
    </svg>
  );
}

function SensorFaucet({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* inlet pipe */}
      <path d="M7 20v-7" />
      {/* body */}
      <path d="M5 13h5" />
      {/* arm */}
      <path d="M10 13v-3h4v3" />
      {/* spout */}
      <path d="M14 13v3" />
      {/* water */}
      <path d="M14 16v1.5" strokeWidth="2" />
      {/* sensor waves */}
      <path d="M17 10a3 3 0 0 1 0 4" />
      <path d="M19 8a6 6 0 0 1 0 8" />
    </svg>
  );
}

function Urinal({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* wall bracket */}
      <rect x="7" y="2" width="10" height="3" rx="1" />
      {/* body — rounded U */}
      <path d="M8 5v9a4 4 0 0 0 8 0V5" />
      {/* drain pipe */}
      <path d="M12 18v3" />
      {/* flush rim */}
      <path d="M8 12h8" />
    </svg>
  );
}

function SquatToilet({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* outer bowl oval */}
      <ellipse cx="12" cy="14" rx="9" ry="6" />
      {/* inner hole */}
      <ellipse cx="12" cy="15" rx="4" ry="2.5" />
      {/* footrest left */}
      <rect x="3" y="7" width="3" height="4" rx="1" />
      {/* footrest right */}
      <rect x="18" y="7" width="3" height="4" rx="1" />
    </svg>
  );
}

function WaterTank({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* tank body */}
      <rect x="5" y="4" width="14" height="13" rx="2" />
      {/* water level line */}
      <path d="M5 13h14" strokeDasharray="3 2" />
      {/* supply pipe up */}
      <path d="M12 4V2" />
      {/* outlet pipe down */}
      <path d="M12 17v3" />
    </svg>
  );
}

function InWallCistern({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* cistern housing */}
      <rect x="3" y="2" width="18" height="16" rx="2" />
      {/* wall line (dashed) */}
      <path d="M3 7h18" strokeDasharray="3 2" />
      {/* flush plate */}
      <rect x="8" y="10" width="8" height="5" rx="1.5" />
      {/* flush button */}
      <circle cx="12" cy="12.5" r="1.5" />
      {/* outlet pipe */}
      <path d="M12 18v3" />
    </svg>
  );
}

function DelayValve({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* left pipe */}
      <path d="M2 12h5" />
      {/* right pipe */}
      <path d="M17 12h5" />
      {/* valve body circle */}
      <circle cx="11" cy="12" r="4.5" />
      {/* handle stem */}
      <path d="M11 5v3" />
      {/* handle bar */}
      <path d="M8 5h6" />
      {/* fill indicator */}
      <circle cx="11" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Sensor({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* sensor body */}
      <rect x="2" y="7" width="9" height="10" rx="2" />
      {/* eye/lens */}
      <circle cx="6.5" cy="12" r="2" />
      <circle cx="6.5" cy="12" r="0.5" fill="currentColor" stroke="none" />
      {/* emission arcs */}
      <path d="M14 9.5a4 4 0 0 1 0 5" />
      <path d="M17 7.5a7 7 0 0 1 0 9" />
      <path d="M20 5.5a10 10 0 0 1 0 13" />
    </svg>
  );
}

function BathroomCabinet({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* mirror frame */}
      <rect x="4" y="2" width="16" height="10" rx="1.5" />
      {/* mirror center (decorative) */}
      <path d="M7 5a5 5 0 0 1 5 5" />
      {/* cabinet body */}
      <rect x="4" y="14" width="16" height="8" rx="1.5" />
      {/* cabinet divider */}
      <path d="M12 14v8" />
      {/* handles */}
      <path d="M9.5 18.5h1" strokeWidth="2" />
      <path d="M13.5 18.5h1" strokeWidth="2" />
      {/* shelf between mirror & cabinet */}
      <path d="M3 13h18" />
    </svg>
  );
}

function DrainPipe({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* outer drain circle */}
      <circle cx="12" cy="12" r="9" />
      {/* inner grate circle */}
      <circle cx="12" cy="12" r="5" />
      {/* grate cross lines */}
      <path d="M12 7v10" />
      <path d="M7 12h10" />
      <path d="M8.5 8.5l7 7" />
      <path d="M15.5 8.5l-7 7" />
    </svg>
  );
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  // Toilet family
  坐便器: Toilet,
  智能坐便器: Toilet,
  轻智能坐便器: Toilet,
  连体坐便器: Toilet,
  // Sink / basin
  台盆: Sink,
  // Urinal / squat
  小便器: Urinal,
  蹲便器: SquatToilet,
  便器: SquatToilet,
  // Tanks & valves
  塑料水箱: WaterTank,
  入墙式水箱: InWallCistern,
  延时阀: DelayValve,
  // Faucets
  感应龙头: SensorFaucet,
  五金龙头: Faucet,
  浴缸龙头: Faucet,
  // Sensor
  感应器: Sensor,
  // Shower
  淋浴花洒: ShowerHead,
  附属配件: Package,
  // Bathtub
  浴缸系列: Bath,
  浴缸: Bath,
  // Drain
  浴缸去水器: DrainPipe,
  // Cabinet
  浴室柜: BathroomCabinet,
};

const FALLBACK = Layers;

export function CategoryIcon({ name, size = 20, className }: Props) {
  // Try exact match first, then partial
  const Icon =
    ICON_MAP[name] ??
    Object.entries(ICON_MAP).find(([key]) => name.includes(key))?.[1] ??
    FALLBACK;

  return <Icon size={size} className={className} />;
}
