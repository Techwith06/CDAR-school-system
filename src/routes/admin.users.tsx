import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "All Users — CDAR Admin Console" },
      {
        name: "description",
        content:
          "Filter and manage every CDAR account by role and department, and deactivate access when needed.",
      },
      { property: "og:title", content: "All Users — CDAR Admin Console" },
      {
        property: "og:description",
        content: "Roles, profiles and permissions across the repository.",
      },
    ],
  }),
  component: AdminUsersLayout,
});

function AdminUsersLayout() {
  return <Outlet />;
}
