import { IndexRoute } from "@generated/routes";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: IndexRoute });
