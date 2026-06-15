import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AIBuilderDashboard } from "@/components/execution/ai-builder-dashboard";

export const Route = createFileRoute("/ai-builder")({
  component: () => (
    <AppShell>
      <AIBuilderDashboard />
    </AppShell>
  ),
});
