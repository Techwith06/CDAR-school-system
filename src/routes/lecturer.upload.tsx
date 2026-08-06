import { createFileRoute } from "@tanstack/react-router";
import { UploadPanel } from "@/components/panels/upload-panel";

export const Route = createFileRoute("/lecturer/upload")({
  head: () => ({
    meta: [
      { title: "Publish Material — CDAR Lecturer Portal" },
      {
        name: "description",
        content:
          "Lecturers publish lecture notes, past questions, assignments and manuals with automatic course categorization.",
      },
      { property: "og:title", content: "Publish Material — CDAR Lecturer Portal" },
      { property: "og:description", content: "Upload once and reach every student on the course." },
    ],
  }),
  component: UploadPanel,
});
