import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPanel } from "@/components/panels/materials-panel";

export const Route = createFileRoute("/lecturer/materials")({
  head: () => ({
    meta: [
      { title: "Course Catalog — CDAR Lecturer Portal" },
      {
        name: "description",
        content: "Browse every material filed against your courses, departments and programs in CDAR.",
      },
      { property: "og:title", content: "Course Catalog — CDAR Lecturer Portal" },
      { property: "og:description", content: "Review what is already published for your courses." },
    ],
  }),
  component: MaterialsPanel,
});
