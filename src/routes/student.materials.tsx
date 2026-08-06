import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPanel } from "@/components/panels/materials-panel";

export const Route = createFileRoute("/student/materials")({
  head: () => ({
    meta: [
      { title: "Find Materials — CDAR Student Portal" },
      {
        name: "description",
        content:
          "Search and filter CDAR lecture notes, past questions, assignments and manuals by department, level, semester and course.",
      },
      { property: "og:title", content: "Find Materials — CDAR Student Portal" },
      { property: "og:description", content: "Filter the catalog and download instantly." },
    ],
  }),
  component: MaterialsPanel,
});
