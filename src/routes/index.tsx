import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/house/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Shell />;
}
