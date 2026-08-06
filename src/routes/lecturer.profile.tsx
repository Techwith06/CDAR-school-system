import { createFileRoute } from "@tanstack/react-router";
import { ProfilePanel } from "@/components/panels/profile-panel";

export const Route = createFileRoute("/lecturer/profile")({
  head: () => ({
    meta: [
      { title: "Staff Profile — CDAR Lecturer Portal" },
      {
        name: "description",
        content: "Manage your CDAR staff profile: name, staff email, department and teaching program.",
      },
      { property: "og:title", content: "Staff Profile — CDAR Lecturer Portal" },
      { property: "og:description", content: "Keep your teaching details up to date." },
    ],
  }),
  component: ProfilePanel,
});
