/**
 * Minimal parser for the Tailwind-like utility strings the DSC uses to describe
 * the hero image layout (`left-[52vw] mt-[-46vw] w-[30vw] md:w-[28vw] lg:left-[58vw]`)
 * and the navbar panel (`h-[calc(100vh-4rem)] md:h-[calc(100vh-4.5rem)]`).
 * Only the utilities that appear in the DSC are supported; anything else throws.
 */
export type TwLayer = "base" | "md" | "lg";

const PROPS: Record<string, string> = {
  w: "width",
  h: "height",
  left: "left",
  right: "right",
  mt: "margin-top",
  pt: "padding-top",
};

export type TwDecls = Record<TwLayer, Record<string, string>>;

function cssValue(raw: string): string {
  // calc(100vh-4rem) -> calc(100vh - 4rem)
  const m = raw.match(/^calc\((.+)\)$/);
  if (m?.[1]) return `calc(${m[1].replace(/(?<=[a-z%\d])-(?=\d)/g, " - ")})`;
  return raw;
}

export function parseTw(input: string): TwDecls {
  const out: TwDecls = { base: {}, md: {}, lg: {} };
  for (const tok of input.split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(?:(md|lg):)?([a-z]+)-\[(.+)\]$/);
    if (!m) throw new Error(`Unsupported utility "${tok}" in "${input}"`);
    const layer = (m[1] ?? "base") as TwLayer;
    const util = m[2] as string;
    const prop = PROPS[util];
    if (!prop) throw new Error(`Unsupported utility prefix "${util}" in "${tok}"`);
    out[layer][prop] = cssValue(m[3] as string);
  }
  return out;
}
