import { useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, Layers, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiCourses, apiDepartments, apiPrograms, type CourseDto } from "@/lib/api";

type Department = { id: number; name: string };
type Program = { id: number; name: string; department: string };

export function DepartmentsPanel() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiDepartments(), apiPrograms(), apiCourses()])
      .then(([deptList, progList, courseList]) => {
        if (cancelled) return;
        if (Array.isArray(deptList)) setDepartments(deptList);
        if (Array.isArray(progList)) setPrograms(progList);
        if (Array.isArray(courseList)) setCourses(courseList);
      })
      .catch(() => {
        /* leave empty when the API is unreachable */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const programsByDepartment = useMemo(() => {
    const byDept: Record<string, Program[]> = {};
    for (const p of programs) {
      (byDept[p.department] ??= []).push(p);
    }
    for (const key of Object.keys(byDept)) {
      const list = byDept[key];
      if (list) list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return byDept;
  }, [programs]);

  const coursesByProgram = useMemo(() => {
    const byProgram: Record<string, CourseDto[]> = {};
    for (const c of courses) {
      if (!c.program) continue;
      (byProgram[c.program] ??= []).push(c);
    }
    for (const key of Object.keys(byProgram)) {
      const list = byProgram[key];
      if (list) list.sort((a, b) => a.course_code.localeCompare(b.course_code));
    }
    return byProgram;
  }, [courses]);

  const totalPrograms = programs.length;

  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Departments & programs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Academic structure — every department with the programs it offers and their courses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <Building2 className="h-3 w-3" /> {departments.length} departments
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Layers className="h-3 w-3" /> {totalPrograms} programs
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading departments…</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No departments have been created yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {departments.map((dept) => {
            const deptPrograms = programsByDepartment[dept.name] ?? [];
            return (
              <section
                key={dept.id}
                className="card-3d reveal-up min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-crimson text-crimson-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold">{dept.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {deptPrograms.length} program{deptPrograms.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>

                {deptPrograms.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No programs assigned yet.</p>
                ) : (
                  <ul className="mt-4 grid gap-3">
                    {deptPrograms.map((program) => {
                      const programCourses = coursesByProgram[program.name] ?? [];
                      return (
                        <li
                          key={program.id}
                          className="rounded-lg border border-border bg-secondary/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2 font-medium">
                              <BookOpen className="h-4 w-4 shrink-0 text-crimson" />
                              <span className="truncate">{program.name}</span>
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {programCourses.length} course
                              {programCourses.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          {programCourses.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {programCourses.map((c) => (
                                <span
                                  key={c.id}
                                  title={c.course_title}
                                  className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                                >
                                  {c.course_code}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
