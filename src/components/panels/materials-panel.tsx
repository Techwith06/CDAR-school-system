import { useEffect, useMemo, useState } from "react";
import { ArrowRight, GraduationCap, Search, SlidersHorizontal, X } from "lucide-react";
import { MaterialCard } from "@/components/material-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEVELS, MATERIAL_TYPES, SEMESTERS, type Material } from "@/lib/cdar-data";
import {
  apiListMaterials,
  apiCourses,
  apiDepartments,
  apiPrograms,
  materialFromDto,
  type MaterialDto,
  type CourseDto,
} from "@/lib/api";

const ALL = "all";
const PAGE_SIZE = 9;

function dedupeMaterials(list: Material[]): Material[] {
  const seen = new Set<string>();
  const out: Material[] = [];
  for (const m of list) {
    const key = m.file_hash ? `hash:${m.file_hash}:${m.course_code}` : `id:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function MaterialsPanel() {
  const [tab, setTab] = useState("materials");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [semester, setSemester] = useState(ALL);
  const [courseCode, setCourseCode] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);

  const [courseQ, setCourseQ] = useState("");
  const [courseDept, setCourseDept] = useState(ALL);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiListMaterials({}), apiCourses(), apiDepartments(), apiPrograms()])
      .then(([list, courseList, deptList, progList]) => {
        if (cancelled) return;
        if (Array.isArray(list) && list.length > 0) {
          setMaterials(dedupeMaterials(list.map((m: MaterialDto) => materialFromDto(m))));
        }
        if (Array.isArray(courseList)) setCourses(courseList);
        if (Array.isArray(deptList)) setDepartments(deptList.map((d) => d.name));
        if (Array.isArray(progList)) setPrograms(progList.map((p) => p.name).filter(Boolean));
      })
      .catch(() => {
        /* leave empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    return materials.filter((m) => {
      if (
        term &&
        !`${m.title} ${m.course_code} ${m.department} ${m.program}`.toLowerCase().includes(term)
      )
        return false;
      if (department !== ALL && m.department !== department) return false;
      if (program !== ALL && m.program !== program) return false;
      if (level !== ALL && m.level !== Number(level)) return false;
      if (semester !== ALL && m.semester !== Number(semester)) return false;
      if (courseCode !== ALL && m.course_code !== courseCode) return false;
      if (type !== ALL && m.type !== type) return false;
      return true;
    });
  }, [materials, debouncedQ, department, program, level, semester, courseCode, type]);

  const courseResults = useMemo(() => {
    const term = courseQ.trim().toLowerCase();
    return courses.filter((c) => {
      if (
        term &&
        !`${c.course_code} ${c.course_title} ${c.department} ${c.program}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (courseDept !== ALL && c.department !== courseDept) return false;
      return true;
    });
  }, [courses, courseQ, courseDept]);

  const courseGroups = useMemo(() => {
    const groups: Record<string, CourseDto[]> = {};
    for (const c of courseResults) {
      const list = groups[c.department] ?? [];
      list.push(c);
      groups[c.department] = list;
    }
    return groups;
  }, [courseResults]);

  const courseFileCount = (code: string) => filtered.filter((m) => m.course_code === code).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const reset = () => {
    setQ("");
    setDepartment(ALL);
    setProgram(ALL);
    setLevel(ALL);
    setSemester(ALL);
    setCourseCode(ALL);
    setType(ALL);
    setPage(1);
  };

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const openCourse = (c: CourseDto) => {
    setCourseCode(c.course_code);
    setDepartment(ALL);
    setProgram(ALL);
    setLevel(ALL);
    setSemester(ALL);
    setType(ALL);
    setQ("");
    setPage(1);
    setTab("materials");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Repository catalog</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Browse every course and material published to CDAR. Search by code, title or department,
          then filter down to exactly what your level needs.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="materials">
            Materials
            <span className="ml-1.5 rounded-full bg-background px-1.5 text-[10px] font-bold text-foreground/70">
              {materials.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="courses">
            Courses
            <span className="ml-1.5 rounded-full bg-background px-1.5 text-[10px] font-bold text-foreground/70">
              {courses.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="h-max rounded-xl border border-border bg-card p-5 shadow-panel lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h2>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={department}
                    onValueChange={(v) => {
                      onFilter(setDepartment)(v);
                      setProgram(ALL);
                      setCourseCode(ALL);
                    }}
                  >
                    <SelectTrigger id="department">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="program">Program</Label>
                  <Select value={program} onValueChange={onFilter(setProgram)}>
                    <SelectTrigger id="program">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="level">Level</Label>
                    <Select value={level} onValueChange={onFilter(setLevel)}>
                      <SelectTrigger id="level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Any</SelectItem>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={String(l)}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="semester">Semester</Label>
                    <Select value={semester} onValueChange={onFilter(setSemester)}>
                      <SelectTrigger id="semester">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Any</SelectItem>
                        {SEMESTERS.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="course">Course code</Label>
                  <Select value={courseCode} onValueChange={onFilter(setCourseCode)}>
                    <SelectTrigger id="course">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All courses</SelectItem>
                      {courses
                        .filter((c) => department === ALL || c.department === department)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.course_code}>
                            {c.course_code} — {c.course_title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="type">Material type</Label>
                  <Select value={type} onValueChange={onFilter(setType)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All types</SelectItem>
                      {MATERIAL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </aside>

            <section>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search titles, course codes and course names, e.g. “past questions BIT231”"
                  className="h-12 pl-10"
                  aria-label="Search materials"
                />
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> materials —
                page {current} of {totalPages}
              </p>

              {pageItems.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
                  <p className="font-semibold">No materials match these filters</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try widening the level, semester or department. New courses may not have
                    materials published yet — check the Courses tab.
                  </p>
                  <Button variant="outline" className="mt-5" onClick={reset}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {pageItems.map((m) => (
                    <MaterialCard key={m.id} material={m} />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-sm text-muted-foreground">
                    {current} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={current === totalPages}
                    onClick={() => setPage(current + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={courseQ}
              onChange={(e) => setCourseQ(e.target.value)}
              placeholder="Search courses by code or name, e.g. “BIT231” or “database”"
              className="h-12 pl-10"
              aria-label="Search courses"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Select value={courseDept} onValueChange={setCourseDept}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{courseResults.length}</span> courses
            </p>
          </div>

          {courseResults.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
              <p className="font-semibold">No courses match your search</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a course code like “BIT231” or a keyword such as “database”.
              </p>
            </div>
          ) : (
            Object.entries(courseGroups).map(([dept, courses]) => (
              <section key={dept} className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <GraduationCap className="h-4 w-4 text-primary" /> {dept}
                  <Badge variant="secondary">{courses.length}</Badge>
                </h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {courses.map((c) => {
                    const files = courseFileCount(c.course_code);
                    return (
                      <article
                        key={c.id}
                        className="card-3d flex flex-col rounded-xl border border-border bg-card p-5 shadow-panel"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs font-bold text-primary">
                            {c.course_code}
                          </p>
                          <Badge variant="secondary" className="max-w-[60%] truncate">
                            {c.program}
                          </Badge>
                        </div>
                        <p className="mt-2 flex-1 font-semibold leading-snug">{c.course_title}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {files} file{files === 1 ? "" : "s"} available
                        </p>
                        {files > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-fit"
                            onClick={() => openCourse(c)}
                          >
                            View materials <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <p className="mt-4 text-xs font-medium text-muted-foreground">
                            No materials published yet
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
