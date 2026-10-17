import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Arm C SSR" },
    ],
    links: [{ rel: "stylesheet", href: "/fonts/source-sans-3.css" }],
  }),
  component: () => (
    <html lang="en-GB">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
export type _ = ReactNode;
