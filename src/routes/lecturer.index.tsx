import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Download, FileUp, Layers, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeDate, typeLabel, type Material } from "@/lib/cdar-data";
import {
  apiListMaterials,
  apiCourses,
  apiListStudents,
  materialFromDto,
  type ApiUser,
  type CourseDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StudentSearch } from "@/components/student-search";

export const Route = createFileRoute("/lecturer/")({
  head: () => ({
    meta: [
      { title: "Teaching Overview — CDAR Lecturer Portal" },
      {
        name: "description",
        content:
          "Lecturer overview of published materials, download reach and course coverage across the CDAR repository.",
      },
      { property: "og:title", content: "Teaching Overview — CDAR Lecturer Portal" },
      { property: "og:description", content: "Track publishing activity and download reach." },
    ],
  }),
  component: LecturerHome,
});

function LecturerHome() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Material[]>([]);
  const [dept, setDept] = useState<Material[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [students, setStudents] = useState<ApiUser[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [mineList, deptList, courseList, studentList] = await Promise.all([
          apiListMaterials({ uploaded_by: String(user.id) }),
          apiListMaterials({ department: user.department }),
          apiCourses(),
          apiListStudents({}),
        ]);
        if (!cancelled) {
          setMine(Array.isArray(mineList) ? mineList.map(materialFromDto) : []);
          setDept(Array.isArray(deptList) ? deptList.map(materialFromDto) : []);
          setCourses(Array.isArray(courseList) ? courseList : []);
          setStudents(Array.isArray(studentList) ? studentList : []);
        }
      } catch {
        if (!cancelled) {
          setMine([]);
          setDept([]);
          setCourses([]);
          setStudents([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const deptStudents = useMemo(
    () => students.filter((s) => s.department === user?.department),
    [students, user?.department],
  );
  const deptCourses = courses.filter((c) => c.department === user?.department);
  const reach = mine.reduce((s, m) => s + m.download_count, 0);

  const stats = [
    { label: "Materials you published", value: mine.length, icon: FileUp },
    { label: "Downloads of your files", value: reach.toLocaleString(), icon: Download },
    { label: "Courses in your department", value: deptCourses.length, icon: Layers },
    { label: "Students in your department", value: deptStudents.length, icon: Users },
  ] as const;

  const gaps = deptCourses.filter(
    (c) => !dept.some((m) => m.course_code === c.course_code && m.type === "past_question"),
  );

  return (
    <div className="w-full px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Teaching overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.department} · publishing activity and course coverage
          </p>
        </div>
        <Button asChild>
          <Link to="/lecturer/upload">
            <FileUp className="mr-2 h-4 w-4" /> Publish material
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-3d reveal-up min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold text-gold-foreground">
              <s.icon className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
          <h2 className="text-lg font-bold">Your published materials</h2>
          {mine.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              You have not published anything yet — start with a lecture note.
            </p>
          ) : (
            <div className="mt-4 min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Downloads</TableHead>
                    <TableHead className="text-right">Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mine.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-[16rem] truncate font-medium">
                        {m.title}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.course_code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{typeLabel(m.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.download_count}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {relativeDate(m.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
          <h2 className="text-lg font-bold">Find a student</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Look up students by full name or index number.
          </p>
          <StudentSearch
            className="mt-4"
            {...(user?.department ? { deptFilter: user.department } : {})}
          />
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
          <h2 className="text-lg font-bold">Coverage gaps</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Courses in your department with no past questions on file.
          </p>
          <ul className="mt-4 grid gap-2">
            {deptCourses.length === 0 ? (
              <li className="text-sm text-muted-foreground">No courses in your department yet.</li>
            ) : gaps.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Every department course has past questions.
              </li>
            ) : (
              gaps.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/lecturer/upload"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:bg-secondary/60"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-primary">{c.course_code}</span>
                      <span className="block truncate">{c.course_title}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            Department catalog: {dept.length} materials in total.
          </p>
        </section>
      </div>
    </div>
  );
}
