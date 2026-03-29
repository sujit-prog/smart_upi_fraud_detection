// ─── Stitch "Editorial Fintech / Architectural Vault" Design System ───────────
// Colors derived directly from Stitch project #928831580998173197

export const C = {
  // ── Backgrounds & Surfaces ──────────────────────────────────────────────────
  bg:                 '#faf8ff',
  surface:            '#faf8ff',
  surfaceLowest:      '#ffffff',
  surfaceLow:         '#f1f3ff',
  surfaceContainer:   '#e9edff',
  surfaceHigh:        '#e2e8fc',
  surfaceHighest:     '#dde2f6',
  surfaceDim:         '#d4d9ed',

  // ── Primary (Deep Blue) ──────────────────────────────────────────────────────
  primary:            '#0040a1',
  primaryContainer:   '#0056d2',
  primaryFixed:       '#dae2ff',
  primaryFixedDim:    '#b2c5ff',
  onPrimary:          '#ffffff',
  onPrimaryContainer: '#ccd8ff',

  // ── Secondary (Teal) ────────────────────────────────────────────────────────
  secondary:          '#006a6a',
  secondaryContainer: '#90efef',
  onSecondary:        '#ffffff',
  onSecondaryContainer: '#006e6e',

  // ── Tertiary (Emerald Green / Success) ──────────────────────────────────────
  tertiary:           '#005136',
  tertiaryContainer:  '#006c49',
  tertiaryFixed:      '#6ffbbe',
  tertiaryFixedDim:   '#4edea3',
  onTertiary:         '#ffffff',
  onTertiaryContainer:'#63f1b4',
  onTertiaryFixed:    '#002113',

  // ── Error / Risk ────────────────────────────────────────────────────────────
  error:              '#ba1a1a',
  errorContainer:     '#ffdad6',
  onError:            '#ffffff',
  onErrorContainer:   '#93000a',

  // ── Text & Icons ────────────────────────────────────────────────────────────
  text:               '#151b29',   // on_background
  textSecondary:      '#424654',   // on_surface_variant
  textMuted:          '#737785',   // outline

  // ── Borders ─────────────────────────────────────────────────────────────────
  outline:            '#737785',
  outlineVariant:     '#c3c6d6',
};

// ── Typography ────────────────────────────────────────────────────────────────
// Manrope = headlines/display, Inter = body/labels
export const T = {
  displayLg:   { fontFamily: 'Manrope-Bold',     fontSize: 48, lineHeight: 56 },
  displayMd:   { fontFamily: 'Manrope-Bold',     fontSize: 36, lineHeight: 44 },
  headlineMd:  { fontFamily: 'Manrope-SemiBold', fontSize: 24, lineHeight: 32 },
  headlineSm:  { fontFamily: 'Manrope-SemiBold', fontSize: 20, lineHeight: 28 },
  titleMd:     { fontFamily: 'Inter-Medium',     fontSize: 16, lineHeight: 24 },
  titleSm:     { fontFamily: 'Inter-Medium',     fontSize: 14, lineHeight: 20 },
  bodyMd:      { fontFamily: 'Inter-Regular',    fontSize: 14, lineHeight: 20 },
  bodySm:      { fontFamily: 'Inter-Regular',    fontSize: 12, lineHeight: 16 },
  labelMd:     { fontFamily: 'Inter-SemiBold',   fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSm:     { fontFamily: 'Inter-SemiBold',   fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
};

// ── Shadows (tinted, never pure black) ────────────────────────────────────────
export const S = {
  sm: {
    shadowColor: '#151b29',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#151b29',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0040a1',
    shadowOpacity: 0.15,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

// ── Spacing Scale (spacingScale: 3 → 1rem = 16px) ────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ── Radius ────────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 999,
};
