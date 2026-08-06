import { createFileRoute } from "@tanstack/react-router";
import labImage from "@/assets/blog-lab.jpg";
import { RoleLoginForm } from "@/components/role-login";

export const Route = createFileRoute("/lecturer_/login")({
  head: () => ({
    meta: [
      { title: "Lecturer Sign In — CDAR Lecturer Portal" },
      {
        name: "description",
        content:
          "Lecturers sign in at /lecturer/login with a staff email to publish lecture notes, past questions and manuals.",
      },
      { property: "og:title", content: "Lecturer Sign In — CDAR" },
      { property: "og:description", content: "Publish and manage teaching materials for your courses." },
    ],
  }),
  component: LecturerLogin,
});

function LecturerLogin() {
  return (
    <RoleLoginForm
      role="lecturer"
      eyebrow="Lecturer portal"
      heading="Publish once. Reach every student on the course."
      blurb="Sign in with the staff email assigned to you by the repository administrator."
      identifierLabel="Staff email"
      identifierPlaceholder="k.mensah@cdar.edu"
      notice="Demo access: k.mensah@cdar.edu, password “lecturer123”. Lecturer accounts are provisioned by the repository administrator."
      image={labImage}
      imageAlt="Lecturer setting up equipment in a teaching lab"
      panelClass="bg-primary text-primary-foreground"
    />
  );
}
