import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Save,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import {
  apiGetUser,
  apiListAssignments,
  apiListEnrollments,
  apiResetPassword,
  apiUpdateUser,
  apiDepartments,
  apiPrograms,
  type ApiUser,
  type CourseDto,
} from "@/lib/api";
import { LEVELS, SEMESTERS, relativeDate } from "@/lib/cdar-data";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "User Profile — CDAR Admin Console" },
      {
        name: "description",
        content: "Full profile details for a CDAR account — academic, contact and account info.",
      },
      { property: "og:title", content: "User Profile — CDAR Admin Console" },
      { property: "og:description", content: "Account, academic and contact details at a glance." },
    ],
  }),
  component: UserDetailPage,
});

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [programsByDept, setProgramsByDept] = useState<Record<string, string[]>>({});
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    studentId: "",
    staffId: "",
    department: "",
    program: "",
    level: "",
    semester: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    address: "",
    isActive: true,
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      setError("Invalid user id.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await apiGetUser(id);
        if (cancelled) return;
        setUser(u);
        const list =
          u.role === "lecturer"
            ? await apiListAssignments(String(id))
            : u.role === "student"
              ? await apiListEnrollments(id)
              : [];
        if (!cancelled) {
          setCourses(Array.isArray(list) ? list.map((a) => a.course) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiDepartments(), apiPrograms()])
      .then(([deptList, progList]) => {
        if (cancelled) return;
        const byDept: Record<string, string[]> = {};
        for (const p of Array.isArray(progList) ? progList : []) {
          if (!p.department) continue;
          (byDept[p.department] ??= []).push(p.name);
        }
        setDepartments((Array.isArray(deptList) ? deptList : []).map((d) => d.name));
        setProgramsByDept(byDept);
      })
      .catch(() => {
        /* keep options empty */
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResetPassword() {
    if (!user) return;
    setResetting(true);
    try {
      const { password } = await apiResetPassword(user.id);
      setNewPassword(password);
      toast.success("Temporary password set. Share it with the account holder.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setResetting(false);
    }
  }

  function startEdit() {
    if (!user) return;
    setForm({
      fullName: user.full_name,
      email: user.email,
      studentId: user.student_id ?? "",
      staffId: user.staff_id ?? "",
      department: user.department ?? "",
      program: user.program ?? "",
      level: user.level ? String(user.level) : "",
      semester: user.semester ? String(user.semester) : "",
      phoneNumber: user.phone_number,
      dateOfBirth: user.date_of_birth ?? "",
      gender: user.gender,
      nationality: user.nationality,
      address: user.address,
      isActive: user.is_active,
    });
    setPictureFile(null);
    setPicturePreview(null);
    setRemovePicture(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setPictureFile(null);
    setPicturePreview(null);
    setRemovePicture(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", form.fullName);
      fd.append("email", form.email);
      fd.append("phone_number", form.phoneNumber);
      fd.append("gender", form.gender);
      fd.append("nationality", form.nationality);
      fd.append("address", form.address);
      if (form.dateOfBirth) fd.append("date_of_birth", form.dateOfBirth);
      fd.append("is_active", String(form.isActive));
      if (user.role === "student") {
        fd.append("student_id", form.studentId);
        fd.append("department_name", form.department);
        fd.append("program_name", form.program || "");
        fd.append("level", form.level || "100");
        fd.append("semester", form.semester || "1");
      } else if (user.role === "lecturer") {
        fd.append("staff_id", form.staffId);
        fd.append("department_name", form.department);
      }
      if (pictureFile) fd.append("profile_picture", pictureFile);
      if (removePicture) fd.append("remove_profile_picture", "true");
      const updated = await apiUpdateUser(user.id, fd);
      setUser(updated);
      setNewPassword(null);
      toast.success("Details updated", { description: "The account details were saved." });
      cancelEdit();
    } catch (err) {
      toast.error("Could not save details", {
        description: err instanceof Error ? err.message : "Check the values and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 pl-0">
          <Link to="/admin/users">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all users
          </Link>
        </Button>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {error ?? "This profile could not be found."}
        </div>
      </div>
    );
  }

  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const accountId = user.role === "student" ? user.student_id : user.staff_id;
  const avatarSrc = picturePreview ?? user.profile_picture;

  const academicRows: [string, string][] = [
    [user.role === "student" ? "Student ID" : "Staff ID", accountId ?? "—"],
    ["Department", user.department ?? "—"],
    ...(user.role === "student"
      ? ([
          ["Program", user.program ?? "—"],
          ["Level", user.level ? `Level ${user.level}` : "—"],
          ["Semester", user.semester ? `Semester ${user.semester}` : "—"],
        ] as [string, string][])
      : []),
  ];
  const contactRows: [string, string][] = [
    ["Phone", user.phone_number || "—"],
    ["Date of birth", formatDate(user.date_of_birth)],
    ["Gender", user.gender || "—"],
    ["Nationality", user.nationality || "—"],
    ["Address", user.address || "—"],
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="pl-0">
        <Link to="/admin/users">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all users
        </Link>
      </Button>

      <section className="mt-4 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-panel">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={user.full_name}
            className="h-24 w-24 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-full bg-crimson font-display text-3xl font-extrabold text-crimson-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user.full_name}</h1>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" /> {user.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="capitalize">{user.role}</Badge>
            <Badge variant={user.is_active ? "secondary" : "outline"}>
              {user.is_active ? "Active" : "Deactivated"}
            </Badge>
            {user.gender && <Badge variant="outline">{user.gender}</Badge>}
          </div>
        </div>
        {!editing && (
          <Button onClick={startEdit}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit details
          </Button>
        )}
      </section>

      {editing ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Edit account details</h2>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit_full_name">Full name</Label>
              <Input
                id="edit_full_name"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            {user.role === "student" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit_student_id">Student ID</Label>
                <Input
                  id="edit_student_id"
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                />
              </div>
            )}
            {user.role === "lecturer" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit_staff_id">Staff / Lecturer ID</Label>
                <Input
                  id="edit_staff_id"
                  value={form.staffId}
                  onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
                />
              </div>
            )}

            {user.role !== "admin" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit_department">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm((f) => ({ ...f, department: v, program: "" }))}
                >
                  <SelectTrigger id="edit_department">
                    <SelectValue
                      placeholder={departmentsLoading ? "Loading…" : "Select a department"}
                    />
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
            )}

            {user.role === "student" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit_program">Program</Label>
                <Select
                  value={form.program}
                  onValueChange={(v) => setForm((f) => ({ ...f, program: v }))}
                >
                  <SelectTrigger id="edit_program">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {(programsByDept[form.department] ?? []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {user.role === "student" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_level">Level</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
                  >
                    <SelectTrigger id="edit_level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_semester">Semester</Label>
                  <Select
                    value={form.semester}
                    onValueChange={(v) => setForm((f) => ({ ...f, semester: v }))}
                  >
                    <SelectTrigger id="edit_semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="edit_phone_number">Phone number</Label>
              <Input
                id="edit_phone_number"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="e.g. 0244 100 234"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit_date_of_birth">Date of birth</Label>
              <Input
                id="edit_date_of_birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit_gender">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
              >
                <SelectTrigger id="edit_gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit_nationality">Nationality</Label>
              <Input
                id="edit_nationality"
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                placeholder="e.g. Ghanaian"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="edit_address">Residential address</Label>
              <Input
                id="edit_address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Accra, Ghana"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user.full_name}
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary font-display text-xl font-extrabold text-muted-foreground">
                {initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Profile picture</p>
              <p className="text-xs text-muted-foreground">
                A clear head-shot, shown across the portals and in search results.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPictureFile(file);
                setRemovePicture(false);
                setPicturePreview(URL.createObjectURL(file));
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" /> Change photo
            </Button>
            {(picturePreview || user.profile_picture) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setPictureFile(null);
                  setPicturePreview(null);
                  setRemovePicture(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Remove
              </Button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Account active</p>
              <p className="text-xs text-muted-foreground">
                Deactivated accounts can no longer sign in.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-crimson text-crimson-foreground hover:bg-crimson/90"
            >
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <UserRound className="h-4 w-4 text-crimson" /> Academic record
              </h2>
              <div className="mt-3 divide-y divide-border">
                {academicRows.map(([label, value]) => (
                  <DetailRow key={label} label={label} value={value} />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Phone className="h-4 w-4 text-crimson" /> Contact & personal
              </h2>
              <div className="mt-3 divide-y divide-border">
                {contactRows.map(([label, value]) => (
                  <DetailRow key={label} label={label} value={value} />
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-panel">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BookOpen className="h-4 w-4 text-crimson" />{" "}
              {user.role === "lecturer"
                ? "Assigned courses"
                : user.role === "student"
                  ? "Enrolled courses"
                  : "Account"}
            </h2>
            {user.role !== "admin" && (
              <ul className="mt-4 grid gap-2">
                {courses.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    No {user.role === "lecturer" ? "courses assigned" : "enrolments"} yet.
                  </li>
                ) : (
                  courses.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-primary">
                          {c.course_code}
                        </span>
                        <span className="block truncate">{c.course_title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c.department}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-panel">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="h-4 w-4 text-crimson" /> Account activity
            </h2>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Joined" value={relativeDate(user.created_at)} />
              <DetailRow label="Last updated" value={formatDate(user.updated_at)} />
              <DetailRow label="Status" value={user.is_active ? "Active" : "Deactivated"} />
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-border p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Sign-in password
              </p>
              {newPassword ? (
                <p className="mt-2 flex items-center gap-2 break-all font-mono text-lg font-extrabold text-crimson">
                  <KeyRound className="h-4 w-4 shrink-0" /> {newPassword}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Passwords are stored as one-way hashes and can't be read back. Reset to issue a
                  new temporary password.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                <KeyRound className="mr-1.5 h-4 w-4" />
                {resetting ? "Generating…" : newPassword ? "Regenerate password" : "Reset password"}
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
