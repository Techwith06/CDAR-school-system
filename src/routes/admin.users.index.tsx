import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/panels/users-panel";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPanel,
});
