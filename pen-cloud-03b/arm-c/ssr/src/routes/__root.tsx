import { NotFoundRoute } from "@generated/routes";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Arm C SSR" },
    ],
    links: [{ rel: "stylesheet", href: "/fonts/source-sans-3.css" }],
  }),
  notFoundComponent: NotFoundRoute,
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en-GB">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
