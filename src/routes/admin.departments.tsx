import { createFileRoute } from "@tanstack/react-router";
import { DepartmentsPanel } from "@/components/panels/departments-panel";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({
    meta: [
      { title: "Departments & Programs — CDAR Admin Console" },
      {
        name: "description",
        content: "Every department on CDAR with the programs it offers and their courses.",
      },
      { property: "og:title", content: "Departments & Programs — CDAR Admin Console" },
      { property: "og:description", content: "The academic structure of the repository." },
    ],
  }),
  component: DepartmentsPanel,
});
