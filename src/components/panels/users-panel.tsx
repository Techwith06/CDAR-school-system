import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeDate, type User } from "@/lib/cdar-data";
import {
  apiListStudents,
  apiListLecturers,
  apiCourses,
  apiDepartments,
  apiListAssignments,
  apiCreateAssignment,
  apiDeleteAssignment,
  apiListEnrollments,
  apiCreateEnrollment,
  apiDeleteEnrollment,
  type ApiUser,
  type CourseDto,
} from "@/lib/api";

const ALL = "all";

type Tab = "students" | "lecturers";

const toUser = (a: ApiUser): User => ({
  id: a.id,
  student_id: a.student_id,
  full_name: a.full_name,
  email: a.email,
  role: a.role,
  department: a.department ?? "",
  created_at: a.created_at,
  active: a.is_active,
});

export function UsersPanel() {
  const [tab, setTab] = useState<Tab>("students");
  const [students, setStudents] = useState<User[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [departments, setDepartments] = useState<string[]>([]);
  const [editing, setEditing] = useState<User | null>(null);

  const [allCourses, setAllCourses] = useState<CourseDto[]>([]);
  const [assigning, setAssigning] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [currentAssignments, setCurrentAssignments] = useState<{ id: number; course: CourseDto }[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    apiListStudents({})
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        setStudents(list.map(toUser));
      })
      .catch(() => {
        /* leave empty when the API is unreachable */
      });
    apiListLecturers({})
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        setLecturers(list.map(toUser));
      })
      .catch(() => {
        /* leave empty when the API is unreachable */
      });
    apiCourses()
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        setAllCourses(list);
      })
      .catch(() => {
        /* leave empty */
      });
    apiDepartments()
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        setDepartments(list.map((d) => d.name));
      })
      .catch(() => {
        /* leave empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = tab === "students" ? students : lecturers;

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((u) => {
      if (term && !`${u.full_name} ${u.email} ${u.student_id ?? ""}`.toLowerCase().includes(term))
        return false;
      if (department !== ALL && u.department !== department) return false;
      return true;
    });
  }, [rows, q, department]);

  const setRows = (next: (prev: User[]) => User[]) =>
    tab === "students" ? setStudents(next) : setLecturers(next);

  const toggleActive = (u: User) => {
    setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    toast.success(u.active ? `${u.full_name} deactivated` : `${u.full_name} reactivated`);
  };

  const saveEdit = (formData: FormData) => {
    if (!editing) return;
    const next: User = {
      ...editing,
      full_name: String(formData.get("full_name") ?? editing.full_name),
      email: String(formData.get("email") ?? editing.email),
      department: String(formData.get("department") ?? editing.department),
      active: formData.get("is_active") === "on",
    };
    setRows((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    setEditing(null);
    toast.success("Profile updated");
  };

  const openAssign = async (u: User) => {
    setAssigning(u);
    setSelectedCourse("");
    setCurrentAssignments([]);
    try {
      const list =
        u.role === "lecturer"
          ? await apiListAssignments(String(u.id))
          : await apiListEnrollments(u.id);
      if (!Array.isArray(list)) {
        setCurrentAssignments([]);
        return;
      }
      setCurrentAssignments(list.map((a) => ({ id: a.id, course: a.course })));
    } catch {
      toast.error("Could not load courses", {
        description: "Showing no current assignments — check the API connection.",
      });
    }
  };

  const available = allCourses.filter((c) => !currentAssignments.some((a) => a.course.id === c.id));

  const addCourse = async () => {
    if (!assigning || !selectedCourse) return;
    const courseId = Number(selectedCourse);
    try {
      if (assigning.role === "lecturer") {
        const a = await apiCreateAssignment(courseId, assigning.id);
        setCurrentAssignments((prev) => [...prev, { id: a.id, course: a.course }]);
      } else {
        const e = await apiCreateEnrollment(courseId, assigning.id);
        setCurrentAssignments((prev) => [...prev, { id: e.id, course: e.course }]);
      }
      setSelectedCourse("");
      toast.success(assigning.role === "lecturer" ? "Course assigned" : "Student enrolled");
    } catch (err) {
      toast.error("Could not assign course", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const removeCourse = async (assignmentId: number) => {
    try {
      if (tab === "lecturers") await apiDeleteAssignment(assignmentId);
      else await apiDeleteEnrollment(assignmentId);
      setCurrentAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success(tab === "lecturers" ? "Course unassigned" : "Enrollment removed");
    } catch (err) {
      toast.error("Could not remove course", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        tab === value
          ? "bg-crimson text-crimson-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">User management</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Search, edit, deactivate accounts and assign courses to students and lecturers across
          every department.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {tabButton("students", "Students", students.length)}
          {tabButton("lecturers", "Lecturers", lecturers.length)}
        </div>
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or student ID"
            className="pl-10"
            aria-label="Search users"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-56">
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: String(u.id) }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {u.full_name}
                  </Link>
                  {!u.active && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      Deactivated
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{u.student_id ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-sm">{u.department}</TableCell>
                <TableCell className="font-mono text-xs">{relativeDate(u.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/users/$userId" params={{ userId: String(u.id) }}>
                      View
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openAssign(u)}>
                    Assign courses
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => toggleActive(u)}
                  >
                    {u.active ? "Deactivate" : "Reactivate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No {tab} match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Showing {visible.length} {tab}
      </p>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {tab === "students" ? "student" : "lecturer"} account</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              id="edit-user"
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit(new FormData(e.currentTarget));
              }}
              className="grid gap-4"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">Full name</Label>
                <Input id="edit-name" name="full_name" defaultValue={editing.full_name} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editing.email} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-department">Department</Label>
                <Select name="department" defaultValue={editing.department}>
                  <SelectTrigger id="edit-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Account active
                </Label>
                <Switch id="edit-active" name="is_active" defaultChecked={editing.active} />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assigning !== null} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign courses — {assigning?.full_name}
              {assigning?.student_id ? ` (${assigning.student_id})` : ""}
            </DialogTitle>
          </DialogHeader>
          {assigning && (
            <div className="grid gap-4">
              <div className="flex items-end gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="assign-course">Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger id="assign-course">
                      <SelectValue
                        placeholder={available.length ? "Select a course" : "All courses assigned"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.course_code} — {c.course_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addCourse} disabled={!selectedCourse}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Assign
                </Button>
              </div>
              <div className="divide-y divide-border rounded-lg border border-border">
                {currentAssignments.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">
                    No {assigning.role === "lecturer" ? "courses assigned" : "enrollments"} yet.
                  </p>
                )}
                {currentAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.course.course_code}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.course.course_title}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeCourse(a.id)}
                      aria-label={`Remove ${a.course.course_code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
