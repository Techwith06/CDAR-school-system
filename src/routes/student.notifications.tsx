import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPanel } from "@/components/panels/notifications-panel";

export const Route = createFileRoute("/student/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts — CDAR Student Portal" },
      {
        name: "description",
        content: "New-material alerts for your courses, level and semester in the CDAR student portal.",
      },
      { property: "og:title", content: "Alerts — CDAR Student Portal" },
      { property: "og:description", content: "Know the moment new course material is published." },
    ],
  }),
  component: NotificationsPanel,
});
