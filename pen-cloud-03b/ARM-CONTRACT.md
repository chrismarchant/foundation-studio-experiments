# PEN-CLOUD-03-B — Arm Contract (shared by the three arms and the harness)

Every arm is a static site or a Node server reachable at `http://127.0.0.1:<port>/` that serves the same routes with the same conventions, so one harness can measure all three. Ports: A `4301`, B `4302`, B' `4303`, C `4304`, C-SSR `4305`.

## Routes

| Route | Renders | Notes |
|---|---|---|
| `/button` | the Primary and the Secondary button side by side, 16 px gap, centred in a 1440-max container with 80 px padding | labels `Button` |
| `/navbar` | Navbar17 | menu closed |
| `/header80` | Header80 alone, inside a scroll container so the section is `150vh` (viewport < 768) or `300vh` tall; the page must be scrollable to the end of the section | the scroll probe drives `window.scrollTo` |
| `/layout620` | Layout620 | |
| `/testimonial37` | Testimonial37 | |
| `/cta25` | Cta25 | |
| `/page` | the five sections in order: navbar, header80, layout620, testimonial37, cta25 | full-page composition |

## Markup conventions (all arms)

- The subject root carries `data-fs-subject="<route name>"`. Arm C additionally carries `data-fs-id="<fs logical id>"` on every component/section root and `data-fs-penpot="<penpot shape id>"` where a mapping exists; other arms carry none (the harness treats these as C-only).
- Body background white, `font-family: "Source Sans 3"` loaded from `inputs/fonts/source-sans-3.css` (copied into each arm's `public/fonts/`), no other web font. Arms must not load fonts from the network.
- Images are placeholders: a `#d9d9d9` rectangle (`<img>` with an inline SVG data URI or a `<div>`), never a network image. Logos/icons are `#000000` rectangles of the sizes the design defines (logo 84×36, nav hamburger 24×2 lines, feature icon 48×48, testimonial logo 120×48, star 24×24, avatar 56×56).
- Synthetic copy is identical across arms and comes from `inputs/copy.json`.
- No analytics, no external requests of any kind.

## Build and serve

Each arm provides `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm serve` (serves the production build on its port, foreground). The harness starts/stops servers itself.

## Scroll probe (Header80)

The harness scrolls so that the section's top is at `scrollY = section.offsetTop + p * (section.offsetHeight - innerHeight)` for `p ∈ {0, 0.25, 0.5, 0.75, 1}`, waits 600 ms, then reads `getComputedStyle(el).transform` of the elements marked `data-fs-motion="images-left"` and `data-fs-motion="images-right"` (all arms must mark the two animated image columns this way; in Arm B they exist as static columns and the harness records "no transform"). Arms honour `prefers-reduced-motion: reduce` by disabling the transform.

## Viewports and browser

1440×900, 768×1024, 375×812; deviceScaleFactor 1; Chromium 1194 (Playwright 1.56.1) headless; `reducedMotion: 'no-preference'` except the reduced-motion check; colour scheme light; locale `en-GB`; timezone `UTC`.
