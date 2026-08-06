import { createFileRoute } from "@tanstack/react-router";
import blogStudy from "@/assets/blog-study.jpg";
import { RoleLoginForm } from "@/components/role-login";

export const Route = createFileRoute("/student_/login")({
  head: () => ({
    meta: [
      { title: "Student Sign In — CDAR Student Portal" },
      {
        name: "description",
        content:
          "Students sign in at /student/login with a student ID or university email to search and download CDAR materials.",
      },
      { property: "og:title", content: "Student Sign In — CDAR" },
      { property: "og:description", content: "Your student portal for lecture notes, past questions and manuals." },
    ],
  }),
  component: StudentLogin,
});

function StudentLogin() {
  return (
    <RoleLoginForm
      role="student"
      eyebrow="Student portal"
      heading="Every note, past question and manual for your level."
      blurb="Use the student ID or university email issued to you at registration."
      identifierLabel="Student ID or university email"
      identifierPlaceholder="UG20231024 or ama.owusu@st.cdar.edu"
      notice="Demo access: ama.owusu@st.cdar.edu (or UG20231024), password “student123”. Otherwise ask your department office to register you."
      image={blogStudy}
      imageAlt="Students revising together with lecture notes and laptops"
      panelClass="bg-hero text-primary-foreground"
    />
  );
}
