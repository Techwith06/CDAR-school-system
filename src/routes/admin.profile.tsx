import { createFileRoute } from "@tanstack/react-router";
import { ProfilePanel } from "@/components/panels/profile-panel";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "Administrator Profile — CDAR Admin Console" },
      {
        name: "description",
        content: "Manage the administrator account details used across the CDAR repository console.",
      },
      { property: "og:title", content: "Administrator Profile — CDAR Admin Console" },
      { property: "og:description", content: "Administrator account details." },
    ],
  }),
  component: ProfilePanel,
});
