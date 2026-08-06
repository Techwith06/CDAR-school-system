import { createFileRoute } from "@tanstack/react-router";
import { ProfilePanel } from "@/components/panels/profile-panel";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — CDAR Student Portal" },
      {
        name: "description",
        content: "Update your student details: department, program, level and semester for better CDAR recommendations.",
      },
      { property: "og:title", content: "My Profile — CDAR Student Portal" },
      { property: "og:description", content: "Keep your academic details current." },
    ],
  }),
  component: ProfilePanel,
});
