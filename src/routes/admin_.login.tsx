import { createFileRoute } from "@tanstack/react-router";
import libraryImage from "@/assets/hero-library.jpg";
import { RoleLoginForm } from "@/components/role-login";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Administrator Sign In — CDAR Admin Console" },
      {
        name: "description",
        content:
          "Repository administrators sign in at /admin/login to register students and lecturers and moderate the CDAR catalog.",
      },
      { property: "og:title", content: "Administrator Sign In — CDAR" },
      { property: "og:description", content: "Account provisioning, moderation and repository oversight." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  return (
    <RoleLoginForm
      role="admin"
      eyebrow="Administrator console"
      heading="Provision accounts. Moderate the catalog."
      blurb="Restricted access for repository administrators only."
      identifierLabel="Administrator email"
      identifierPlaceholder="admin"
      notice="Demo access: email “admin”, password “admin”. All sign-in attempts are logged."
      image={libraryImage}
      imageAlt="University library reading hall"
      panelClass="bg-crimson text-crimson-foreground"
    />
  );
}
