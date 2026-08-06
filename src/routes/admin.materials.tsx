import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPanel } from "@/components/panels/materials-panel";

export const Route = createFileRoute("/admin/materials")({
  head: () => ({
    meta: [
      { title: "Moderate Catalog — CDAR Admin Console" },
      {
        name: "description",
        content: "Administrators review and moderate every material published to the CDAR repository.",
      },
      { property: "og:title", content: "Moderate Catalog — CDAR Admin Console" },
      { property: "og:description", content: "Review uploads across all departments and programs." },
    ],
  }),
  component: MaterialsPanel,
});
