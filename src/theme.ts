/**
 * EcoTrack theme — ported from design/tokens.css (derived from open-design `clean`).
 * Single source of truth for colors, spacing, radius, type. See DESIGN.md.
 */

export const Color = {
  // surfaces
  bg: '#ffffff',
  surface: '#f4f7f5',
  surfaceWarm: '#e8f0ea',
  surfaceMap: '#e9eef0',
  // ink
  fg: '#0f1f17',
  fg2: '#2f4339',
  muted: '#6b7d73',
  border: '#d8e2db',
  borderSoft: '#eaf0ec',
  // brand
  accent: '#1b7f4b',
  accentOn: '#ffffff',
  accentHover: '#166b40',
  accentActive: '#125736',
  eco: '#2ecc71',
  ecoSoft: '#d6f5e3',
  // status
  success: '#168a46',
  warn: '#f5a623',
  danger: '#e5484d',
  dangerSoft: '#fde7e8',
} as const;

/** Emission / AQI heat ramp, low -> high. Index 0..4 = levels 1..5. */
export const Heat = ['#2ecc71', '#a3d911', '#f5c518', '#f5a623', '#e5484d'] as const;

/** Readable ink color to sit on each heat swatch (colorblind-safe: never color alone). */
export const HeatInk = ['#08351c', '#2d3a06', '#4a3c05', '#4a2f05', '#ffffff'] as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 9999,
} as const;

export const Font = {
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, xxl: 28, xxxl: 34 },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const Elevation = {
  card: {
    shadowColor: '#0f1f17',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  fab: {
    shadowColor: '#1b7f4b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  sheet: {
    shadowColor: '#0f1f17',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 16,
  },
} as const;
