import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { BuildsPage } from "@/components/builds/BuildsPage";

export const Route = createFileRoute("/admin/app-versions")({
  component: () => (
    <AppShell>
      <BuildsPage />
    </AppShell>
  ),
});
