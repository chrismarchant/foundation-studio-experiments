import { findRoute } from "@generated/routes";
import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * One splat route: the route table (paths, titles, components) is the generated
 * routes.tsx, so C and C-SSR serve exactly the same routes from the same components.
 */
export const Route = createFileRoute("/$")({
  beforeLoad: ({ params }) => {
    if (!findRoute(`/${params._splat ?? ""}`)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `${findRoute(`/${params._splat ?? ""}`)?.title ?? "Not found"} | Arm C SSR` }],
  }),
  component: SplatRoute,
});

function SplatRoute() {
  const { _splat } = Route.useParams();
  const route = findRoute(`/${_splat ?? ""}`);
  return route ? <route.Component /> : null;
}
