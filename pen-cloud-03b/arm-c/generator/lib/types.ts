export interface DscToken {
  id: string;
  type: string;
  value: string;
  set: string;
  responsive?: Record<string, string>;
  external?: Record<string, unknown>;
}

/** Relume screen (DSC r3 `screens`): min-width plus the container width that applies from it. */
export interface DscScreen {
  id: string;
  minWidth: number;
  container: string;
}

export interface DscBreakpoint {
  id: string;
  minWidth: number;
  /** Screen this design tier coincides with (DSC r3); null = below the smallest screen layer (base). */
  screen?: string | null;
  canvas: number;
  container: number;
  sidePadding: string;
}

export interface DscBinding {
  property: string;
  token: string;
}

/** Button geometry (px). r4 adds paddingY, labelLineHeight and sizing "padding" (no fixed height). */
export interface DscButtonGeometry {
  height: number;
  paddingX: number;
  paddingY?: number;
  gap: number;
  strokeWidth: number;
  labelLineHeight?: number;
  sizing?: string;
}

export interface DscComponent {
  id: string;
  kind: string;
  external: {
    penpot?: Record<string, string>;
    relume?: Record<string, unknown>;
    claudeDesign?: Record<string, unknown>;
  };
  bindings: DscBinding[];
  geometry?: DscButtonGeometry;
  /** DSC r4 button rule text (not consumed; the geometry fields are). */
  sizingRule?: string;
  responsive?: Record<string, Record<string, unknown>>;
  // biome-ignore lint/suspicious/noExplicitAny: DSC interaction blocks are free-form specs
  interaction?: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: DSC layout blocks are free-form specs
  layout?: Record<string, any>;
}

export interface Dsc {
  dsc: string;
  id: string;
  revision: string;
  tokens: { entries: DscToken[] };
  breakpoints: DscBreakpoint[];
  /** DSC r3 and later; absent in r1/r2. */
  screens?: DscScreen[];
  components: DscComponent[];
  typography?: { family: string };
}

export interface SacAnnotation {
  role: string;
  logicalId: string;
  penpotId: string;
  breakpoint: "desktop" | "tablet" | "mobile";
  section: string;
  landmark?: string;
  level?: number;
  bbc?: string[];
  instanceOf?: string;
  name?: string;
  interactive?: boolean;
}

export interface Sac {
  v: string;
  annotations: SacAnnotation[];
}

export interface PenNode {
  id: string;
  n: string;
  t: string;
  x: number;
  y: number;
  w: number;
  h: number;
  flex?: { dir: string; gap: [number, number]; pad: [number, number, number, number] };
  k?: PenNode[];
  fill?: [string, number];
  text?: { chars: string; size: string; weight: string; lh: string; align: string };
}

export interface PenBoard {
  id: string;
  w: number;
  h: number;
  sections: PenNode[];
}

export interface PenStructure {
  boards: { desktop: PenBoard; tablet: PenBoard; mobile: PenBoard };
  heroA: PenNode;
}

export type CopyButton = { label: string; variant: "primary" | "secondary" | "link" };

export interface Copy {
  navbar: { logoAlt: string; button: string; links: string[] };
  header80: { heading: string; description: string; buttons: CopyButton[]; images: number };
  layout620: {
    tagline: string;
    heading: string;
    description: string;
    items: { heading: string; description: string }[];
    buttons: CopyButton[];
  };
  testimonial37: {
    heading: string;
    description: string;
    cards: (
      | { kind: "logo" }
      | {
          kind: "quote";
          stars: number;
          quote: string;
          name: string;
          position: string;
          company: string;
        }
    )[];
  };
  cta25: { heading: string; description: string; buttons: CopyButton[] };
}

export type Bp = "lg" | "md" | "sm";
export type PerBp<T> = Record<Bp, T>;
