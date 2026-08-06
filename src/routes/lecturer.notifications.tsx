import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPanel } from "@/components/panels/notifications-panel";

export const Route = createFileRoute("/lecturer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CDAR Lecturer Portal" },
      {
        name: "description",
        content: "Upload confirmations and course notices for your CDAR lecturer account.",
      },
      { property: "og:title", content: "Notifications — CDAR Lecturer Portal" },
      { property: "og:description", content: "Upload confirmations and department notices." },
    ],
  }),
  component: NotificationsPanel,
});
