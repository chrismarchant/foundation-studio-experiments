import type { Ctx } from "../lib/ctx.ts";
import { emit, emitCss, OUT } from "../lib/emitutil.ts";

export interface RouteSpec {
  path: string;
  name: string;
  title: string;
  /** Text that must appear in the server-rendered HTML of the route */
  expectText: string;
}

export function routeSpecs(ctx: Ctx): RouteSpec[] {
  const c = ctx.copy;
  return [
    { path: "/button", name: "button", title: "Button", expectText: c.header80.buttons[0]?.label ?? "Button" },
    { path: "/navbar", name: "navbar", title: "Navbar17", expectText: c.navbar.logoAlt },
    { path: "/header80", name: "header80", title: "Header80", expectText: c.header80.heading },
    { path: "/layout620", name: "layout620", title: "Layout620", expectText: c.layout620.heading },
    { path: "/testimonial37", name: "testimonial37", title: "Testimonial37", expectText: c.testimonial37.heading },
    { path: "/cta25", name: "cta25", title: "Cta25", expectText: c.cta25.heading },
    { path: "/page", name: "page", title: "Page", expectText: c.header80.heading },
  ];
}

export function emitRoutes(ctx: Ctx): void {
  const F = "routes.css";
  const specs = routeSpecs(ctx);
  const css = ctx.newCss();
  const lit = (prop: string, v: string) =>
    ctx.lit(F, prop, v, "route layout from ARM-CONTRACT (/button container)", "ARM-CONTRACT.md#routes");
  css.rule("base", ".fs-route-button", {
    "max-width": lit("max-width", "1440px"),
    "margin-inline": "auto",
    padding: lit("padding", "80px"),
    display: "flex",
    "justify-content": "center",
    gap: ctx.tokens.ref(F, "space.gap.4"),
  });
  css.rule("base", ".fs-route-index", {
    "max-width": lit("max-width", "1440px"),
    "margin-inline": "auto",
    padding: lit("padding", "80px"),
  });
  emitCss(ctx, `${OUT}/routes.css`, css);

  emit(
    ctx,
    `${OUT}/routes.tsx`,
    `${ctx.header.ts}import type { ReactNode } from "react";
import { Button } from "./Button";
import { Cta } from "./Cta";
import { Features } from "./Features";
import { Hero } from "./Hero";
import { Navbar } from "./Navbar";
import { Testimonials } from "./Testimonials";
import { copy } from "./copy";
import "./tokens.css";
import "./base.css";
import "./routes.css";

export interface FsRoute {
  readonly path: string;
  readonly name: string;
  readonly title: string;
  /** Text that must be present in the server-rendered HTML of the route. */
  readonly expectText: string;
  readonly Component: () => ReactNode;
}

export function ButtonRoute() {
  return (
    <main>
      <div className="fs-route-button" data-fs-subject="button">
        <Button variant="primary">{copy.header80.buttons[0].label}</Button>
        <Button variant="secondary">{copy.header80.buttons[1].label}</Button>
      </div>
    </main>
  );
}

export function NavbarRoute() {
  return <Navbar subject="navbar" />;
}

export function Header80Route() {
  return (
    <main>
      <Hero subject="header80" />
    </main>
  );
}

export function Layout620Route() {
  return (
    <main>
      <Features subject="layout620" />
    </main>
  );
}

export function Testimonial37Route() {
  return (
    <main>
      <Testimonials subject="testimonial37" />
    </main>
  );
}

export function Cta25Route() {
  return (
    <main>
      <Cta subject="cta25" />
    </main>
  );
}

export function PageRoute() {
  return (
    <div data-fs-subject="page">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <Cta />
      </main>
    </div>
  );
}

export const routes: readonly FsRoute[] = [
${specs
  .map((s) => {
    const comp = `${s.name.charAt(0).toUpperCase()}${s.name.slice(1)}Route`;
    return `  {
    path: ${JSON.stringify(s.path)},
    name: ${JSON.stringify(s.name)},
    title: ${JSON.stringify(s.title)},
    expectText: ${JSON.stringify(s.expectText)},
    Component: ${comp},
  },`;
  })
  .join("\n")}
];

export function IndexRoute() {
  return (
    <main className="fs-route-index">
      <h1>Arm C routes</h1>
      <ul>
        {routes.map((r) => (
          <li key={r.path}>
            <a href={r.path}>{r.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function NotFoundRoute() {
  return (
    <main className="fs-route-index">
      <h1>Not found</h1>
    </main>
  );
}

export function findRoute(pathname: string): FsRoute | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\\/+$/, "") : pathname;
  return routes.find((r) => r.path === clean);
}
`,
  );
}
