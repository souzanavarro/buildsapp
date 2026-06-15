import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AIBuilderWorkspace } from "@/components/execution/ai-builder-workspace";

export const Route = createFileRoute("/ai-builder/$id")({
  component: () => (
    <AppShell>
      <AIBuilderWorkspace />
    </AppShell>
  ),
});
