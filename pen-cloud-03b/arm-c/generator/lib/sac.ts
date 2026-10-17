import type { Sac, SacAnnotation } from "./types.ts";

export interface FsMeta {
  id: string;
  idTablet?: string;
  idMobile?: string;
  component?: string;
  penpot?: string;
  penpotTablet?: string;
  penpotMobile?: string;
  bbc?: string;
}

const TAG_FOR_ROLE: Record<string, (level?: number) => string> = {
  navigation: () => "nav",
  hero: () => "header",
  heading: (level) => {
    if (!level || level < 1 || level > 6) throw new Error(`heading without level`);
    return `h${level}`;
  },
  "feature-section": () => "section",
  testimonials: () => "section",
  "cta-section": () => "section",
  "cta-primary": () => "button",
  "cta-secondary": () => "button",
  link: () => "a",
};

export class SacIndex {
  private readonly byId = new Map<string, SacAnnotation>();
  readonly consumed = new Set<string>();

  constructor(sac: Sac) {
    for (const a of sac.annotations) {
      if (this.byId.has(a.logicalId)) throw new Error(`Duplicate SAC logicalId ${a.logicalId}`);
      this.byId.set(a.logicalId, a);
    }
  }

  get(logicalId: string): SacAnnotation {
    const a = this.byId.get(logicalId);
    if (!a) throw new Error(`SAC annotation ${logicalId} missing`);
    return a;
  }

  all(): SacAnnotation[] {
    return [...this.byId.values()].sort((a, b) => (a.logicalId < b.logicalId ? -1 : 1));
  }

  tag(a: SacAnnotation): string {
    const f = TAG_FOR_ROLE[a.role];
    if (!f) throw new Error(`No element mapping for SAC role ${a.role}`);
    return f(a.level);
  }

  /**
   * `base` is the desktop logical id, e.g. `fs.section.hero.desktop.h1`.
   * The tablet/mobile twins are derived by swapping the breakpoint segment and must exist.
   */
  meta(desktopId: string, component?: string): FsMeta & { role: string; tag: string; level?: number } {
    const d = this.get(desktopId);
    if (d.breakpoint !== "desktop") throw new Error(`${desktopId} is not a desktop annotation`);
    const tab = this.get(desktopId.replace(".desktop", ".tablet"));
    const mob = this.get(desktopId.replace(".desktop", ".mobile"));
    for (const x of [d, tab, mob]) {
      if (x.role !== d.role) throw new Error(`SAC role differs across breakpoints for ${desktopId}`);
      this.consumed.add(x.logicalId);
    }
    const m: FsMeta & { role: string; tag: string; level?: number } = {
      id: d.logicalId,
      idTablet: tab.logicalId,
      idMobile: mob.logicalId,
      penpot: d.penpotId,
      penpotTablet: tab.penpotId,
      penpotMobile: mob.penpotId,
      role: d.role,
      tag: this.tag(d),
    };
    if (component ?? d.instanceOf) m.component = (component ?? d.instanceOf) as string;
    if (d.bbc?.length) m.bbc = d.bbc.join(",");
    if (d.level !== undefined) m.level = d.level;
    return m;
  }
}
