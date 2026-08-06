import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPanel } from "@/components/panels/notifications-panel";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "System Notices — CDAR Admin Console" },
      {
        name: "description",
        content: "System notices, upload confirmations and account events for CDAR administrators.",
      },
      { property: "og:title", content: "System Notices — CDAR Admin Console" },
      { property: "og:description", content: "Repository events and account activity." },
    ],
  }),
  component: NotificationsPanel,
});
