import type { Bp, PenNode, PenStructure, PerBp } from "./types.ts";

const BOARD: Record<Bp, "desktop" | "tablet" | "mobile"> = { lg: "desktop", md: "tablet", sm: "mobile" };

function descendants(n: PenNode): PenNode[] {
  const out: PenNode[] = [];
  const walk = (x: PenNode) => {
    for (const k of x.k ?? []) {
      out.push(k);
      walk(k);
    }
  };
  walk(n);
  return out;
}

/**
 * Query layer over the Penpot structure observations (OD-41).
 * Selector grammar: "A > B > C" = C anywhere below B anywhere below A (inside the named section).
 * `nth` picks the nth match (document order) of the last element.
 */
export class Obs {
  constructor(private readonly s: PenStructure) {}

  section(bp: Bp, name: string): PenNode {
    const sec = this.s.boards[BOARD[bp]].sections.find((x) => x.n === name);
    if (!sec) throw new Error(`Observation: section ${name} missing on ${BOARD[bp]}`);
    return sec;
  }

  q(bp: Bp, section: string, selector: string, nth = 0): PenNode {
    let nodes: PenNode[] = [this.section(bp, section)];
    const chain = selector.split(">").map((x) => x.trim());
    for (const name of chain) {
      const next: PenNode[] = [];
      for (const n of nodes) {
        for (const d of descendants(n)) if (d.n === name) next.push(d);
      }
      nodes = next;
      if (!nodes.length) throw new Error(`Observation: ${section} > ${selector} (${bp}) not found at "${name}"`);
    }
    const hit = nodes[nth];
    if (!hit) throw new Error(`Observation: ${section} > ${selector}[${nth}] (${bp}) not found`);
    return hit;
  }

  sectionId(bp: Bp, name: string): string {
    return this.section(bp, name).id;
  }

  perBp<T>(f: (bp: Bp) => T): PerBp<T> {
    return { lg: f("lg"), md: f("md"), sm: f("sm") };
  }

  gap(bp: Bp, section: string, selector: string, nth = 0, axis: 0 | 1 = 0): number {
    const n = this.q(bp, section, selector, nth);
    if (!n.flex) throw new Error(`Observation: ${selector} has no flex layout`);
    return n.flex.gap[axis];
  }

  pad(bp: Bp, section: string, selector: string, side: 0 | 1 | 2 | 3, nth = 0): number {
    const n = this.q(bp, section, selector, nth);
    if (!n.flex) throw new Error(`Observation: ${selector} has no flex layout`);
    return n.flex.pad[side];
  }

  height(bp: Bp, section: string, selector: string, nth = 0): number {
    return this.q(bp, section, selector, nth).h;
  }

  width(bp: Bp, section: string, selector: string, nth = 0): number {
    return this.q(bp, section, selector, nth).w;
  }

  /** Section-level padding/size (the section root itself). */
  rootPad(bp: Bp, section: string, side: 0 | 1 | 2 | 3): number {
    const n = this.section(bp, section);
    if (!n.flex) throw new Error(`Observation: ${section} root has no flex layout`);
    return n.flex.pad[side];
  }

  rootHeight(bp: Bp, section: string): number {
    return this.section(bp, section).h;
  }
}
