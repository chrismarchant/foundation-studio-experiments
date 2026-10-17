import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: () => <h1>Hello SSR</h1> });
