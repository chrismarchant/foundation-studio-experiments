import { useEffect, useState } from "react";
import { findRoute, IndexRoute, NotFoundRoute } from "./generated/routes";

/** Minimal path router: the route table lives in the generated routes.tsx. */
export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const route = findRoute(path);
  useEffect(() => {
    document.title = route ? `${route.title} | Arm C` : "Arm C";
  }, [route]);

  if (route) return <route.Component />;
  if (path === "/") return <IndexRoute />;
  return <NotFoundRoute />;
}
