import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookMarked, Download, GraduationCap, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { MaterialCard } from "@/components/material-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeDate, typeLabel, type Material } from "@/lib/cdar-data";
import {
  apiListMaterials,
  apiCourses,
  apiListNotifications,
  materialFromDto,
  type CourseDto,
  type NotificationDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "My Study Hub — CDAR Student Portal" },
      {
        name: "description",
        content:
          "Your personalised CDAR study hub: course shelves, recommended materials and alerts for your level and semester.",
      },
      { property: "og:title", content: "My Study Hub — CDAR Student Portal" },
      { property: "og:description", content: "Course shelves and recommendations for your level." },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiListMaterials({}), apiCourses(), apiListNotifications()])
      .then(([list, courseList, noteList]) => {
        if (cancelled) return;
        if (Array.isArray(list)) setMaterials(list.map(materialFromDto));
        if (Array.isArray(courseList)) setCourses(courseList);
        if (Array.isArray(noteList)) setNotifications(noteList);
      })
      .catch(() => {
        /* leave empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const forMe = materials.filter(
    (m) => m.department === user?.department && m.level === user?.level,
  );
  const shelves = courses
    .filter((c) => c.department === user?.department)
    .map((c) => ({
      ...c,
      count: materials.filter((m) => m.course_code === c.course_code).length,
    }));
  const newest = [...materials]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 4);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <GraduationCap className="h-4 w-4" /> Study hub
        </p>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          Good to see you, {user?.full_name.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {forMe.length} materials match {user?.program} · Level {user?.level} · Semester{" "}
          {user?.semester}. Everything you download stays available offline in your browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/student/materials">
              Materials <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/student/notifications">{unread} new alerts</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BookMarked className="h-4 w-4 text-primary" /> Your course shelves
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shelves.map((c) => (
            <Link
              key={c.id}
              to="/student/materials"
              className="card-3d reveal-up rounded-xl border border-border bg-card p-5"
            >
              <p className="font-mono text-xs text-primary">{c.course_code}</p>
              <p className="mt-1.5 font-semibold leading-snug">{c.course_title}</p>
              <p className="mt-3 text-xs text-muted-foreground">{c.count} files available</p>
            </Link>
          ))}
          {shelves.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No courses published for your department yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-4 w-4 text-gold" /> Recommended for your level
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(forMe.length ? forMe : materials).slice(0, 3).map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      </section>

      <section className="mt-10 min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Download className="h-4 w-4 text-primary" /> Just published
        </h2>
        <ul className="mt-4 grid gap-3">
          {newest.map((m) => (
            <li
              key={m.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.course_code} · {relativeDate(m.created_at)}
                </p>
              </div>
              <Badge variant="secondary">{typeLabel(m.type)}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
