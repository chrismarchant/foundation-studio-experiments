# Arm B / B' notes (PEN-CLOUD-03-B)

Official Penpot `generateMarkup` / `generateStyle` output (`penpot-output.json`, captured 2026-10-17T17:28:41Z), wrapped mechanically. No hand-written layout code.

## Pipeline
`pnpm generate` = `scripts/dedupe.mjs` -> `generated/` ; `scripts/wrap.mjs` -> `wrapped/` ; `scripts/copy-fonts.mjs` -> `react/public/fonts/`.
`pnpm build` = generate + `build:static` (`static/`) + `build:react` (`react/dist/`). `pnpm serve` = static on 4302. `pnpm serve:react` = `vite preview --port 4303 --strictPort --host 127.0.0.1`.

## Mechanical edits (all logged)
1. **Font alias** (CSS): literal `"sourcesanspro"` -> `"Source Sans 3"`, 86 replacements across 17 items (`generated/dedupe-log.json`, `fontFamilyReplacements`). Penpot's `generateFontFaces` output is NOT used; fonts are `inputs/fonts/` copied verbatim to `static/fonts/` and `react/public/fonts/`. No other CSS edit. CSS for `page` is the five section CSS files concatenated; `button` is Primary + Secondary CSS concatenated.
2. **Dedupe** (HTML, `scripts/dedupe.mjs`, parse5 8.0.1): removes top-level elements whose id-suffixed class set already occurs inside an earlier retained element; the preceding comment goes with it; retained bytes are untouched (range splice). 17 items: 3581 -> 790 elements, 343 top-level duplicates removed. Per item (e.g. desktop): navbar 47->14, header80 138->39, layout620 395->88, testimonial37 533->87, cta25 116->31; tablet/mobile and library buttons (13->7 each) in the log, with removed ids. Asserted after each item: no repeated shape class set, no repeated DOM id, no unique shape lost. Rich-text internals (`root-0`, `paragraph-set-...`) reuse generic class names, so only classes with a 12-hex id suffix are dedupe keys.
3. **Motion attributes** (`scripts/wrap.mjs`): `data-fs-motion="images-left"` / `"images-right"` spliced into the `images-left-*` / `images-righ-*` frames of Header80: 2 per variant x 3 breakpoints = 6 in `header80` files, plus 6 in the `page` files (12 insertions total).
4. **Wrappers** (no Penpot markup altered): `<div data-fs-subject="<route>" class="fs-stage">` (flex column, centred, width 100%: reproduces the body context Penpot's CSS assumes). Header80 wrapper height is 300vh (desktop, tablet) or 150vh (mobile file), static (not sticky); in `/page` the same height sits on `data-fs-section="header80"`. `/page` stacks navbar, header80, layout620, testimonial37, cta25 in `data-fs-section` divs. `/button`: the library mains are exported `position:absolute; left/top; width:100%`, so each sits in a slot sized from its own `min-width`/`min-height` (95x48) with an origin box offset by `-left/-top` (24/24 and 200/24, read from the CSS); 16px gap, 1440 max, 80px padding, centred. Wrapper CSS is `wrapped/prelude.css` (body white), kept separate from Penpot CSS.

## Arm B (static, 4302) — breakpoint mapping
`static/<route>.html` (desktop), `<route>.tablet.html`, `<route>.mobile.html` (button files are identical). `scripts/serve-static.mjs` (sirv 3.0.2) rewrites `/route?bp=tablet|mobile` internally to the matching file (no redirect); the `.tablet.html`/`.mobile.html` files are also directly addressable. Each document: doctype, viewport meta, `/fonts/source-sans-3.css`, prelude `<style>`, Penpot `<style>`, wrapped fragment.

## Arm B' (React, 4303)
`react/`: Vite 7.3.7 + React 19.3.1; `src/App.jsx` injects two `<style>` and renders the fragment with `dangerouslySetInnerHTML`; `routes.js` imports `wrapped/**` via `import.meta.glob(?raw)`. `bp` is read from `location.search` in the browser (flushSync render before load). Build also prerenders the desktop variant into `dist/<route>.html` (react-dom/server) so non-JS clients/curl see content; vite preview resolves `/route` to `route.html`. Tablet/mobile variants need JS (curl of `?bp=` shows desktop HTML). `#root` and the host div are `display: contents`.

## Versions (exact, `pnpm-lock.yaml`)
Node 22.22.0, pnpm 10.28.0, parse5 8.0.1, sirv 3.0.2, vite 7.3.7, @vitejs/plugin-react 5.2.0, react / react-dom 19.3.1. pnpm workspace root + `react/`. `esbuild` postinstall is not approved (not needed).

## Known characteristics
- Penpot CSS sets `body{display:flex;width:100vw}`: with a classic scrollbar this can add horizontal overflow; left unedited. Primary button has `border: 1px  #000000FF` (invalid, Penpot output), left as is.
- Arm B has no runtime motion; the two image columns are static (`transform: none`).
- No external requests: only XML-namespace strings and a React error-doc string appear in the bundle.

## Verification (`pnpm build`, then `node scripts/verify.mjs` starts both servers, GETs, stops them)
- `pnpm build`: exit 0; `pnpm install --frozen-lockfile`: lockfile up to date.
- B (4302): 7 routes x {desktop, ?bp=tablet, ?bp=mobile} = 21 GETs, all 200, `data-fs-subject` present, heading text present (navbar/button: `Button`; header80 `Design systems that move with your product` plus both motion attributes; layout620 `Three reasons teams pick this synthetic product`; testimonial37 `Customer testimonials`; cta25 `Ready to try the synthetic product?`; page: all four). `/fonts/source-sans-3.css` 200.
- B' (4303): 7 routes, all 200 with the same checks (desktop prerender); fonts 200.
- Servers stopped afterwards; nothing listening.
- Not done: no browser in this environment, so no visual/pixel check or scroll probe was run.
