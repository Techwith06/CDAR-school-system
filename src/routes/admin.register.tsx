import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { LEVELS, SEMESTERS } from "@/lib/cdar-data";
import { apiRegister, apiDepartments, apiPrograms, apiIdPreview } from "@/lib/api";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export const Route = createFileRoute("/admin/register")({
  head: () => ({
    meta: [
      { title: "Register Account — CDAR Admin Console" },
      {
        name: "description",
        content:
          "Administrators create student and lecturer accounts for CDAR, assigning department, program, level and semester.",
      },
      { property: "og:title", content: "Register Account — CDAR Admin Console" },
      {
        property: "og:description",
        content: "Provision student and lecturer access to the repository.",
      },
    ],
  }),
  component: RegisterAccountPage,
});

function generateTempPassword(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const all = letters + digits;
  const pick = (src: string) => src[Math.floor(Math.random() * src.length)] ?? "a";
  let pw = pick(letters) + pick(digits);
  for (let i = 0; i < 6; i++) pw += pick(all);
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function RegisterAccountPage() {
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [idLoading, setIdLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [programsByDept, setProgramsByDept] = useState<Record<string, string[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempPassword(generateTempPassword());
  }, []);

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
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshId = () => {
    if (!department) {
      setGeneratedId("");
      return;
    }
    const cancelled = false;
    setIdLoading(true);
    apiIdPreview({
      role,
      department,
      ...(role === "student" && program ? { program } : {}),
    })
      .then((res) => {
        if (!cancelled) setGeneratedId(res.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setGeneratedId("");
      })
      .finally(() => {
        if (!cancelled) setIdLoading(false);
      });
  };

  useEffect(() => {
    refreshId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, department, program]);

  const programOptions = programsByDept[department] ?? [];
  const generatedEmail = generatedId ? `${generatedId.replaceAll("/", "")}@edu.com` : "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Accounts</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Register a new account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Students and lecturers cannot sign themselves up — every account is created here and the
          credentials are issued to the holder.
        </p>
      </header>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          const form = e.currentTarget;
          const data = new FormData(form);
          const name = String(data.get("full_name") ?? "");
          if (!name) {
            toast.error("Validation error", {
              description: "Full name is required.",
            });
            return;
          }
          if (role === "student" && (!level || !semester)) {
            toast.error("Validation error", {
              description: "Level and semester are required for students.",
            });
            return;
          }
          if (!department || !generatedEmail) {
            toast.error("Validation error", {
              description: "Select a department so the ID and university email can be generated.",
            });
            return;
          }
          setSubmitting(true);
          try {
            const fd = new FormData();
            fd.append("full_name", name);
            fd.append("email", generatedEmail);
            fd.append("password", tempPassword);
            fd.append("role", role);
            fd.append(role === "student" ? "student_id" : "staff_id", generatedId || "");
            fd.append("department_name", department);
            if (program) fd.append("program_name", program);
            if (level) fd.append("level", level);
            if (semester) fd.append("semester", semester);
            fd.append("phone_number", phoneNumber);
            if (dateOfBirth) fd.append("date_of_birth", dateOfBirth);
            fd.append("gender", gender);
            fd.append("nationality", nationality);
            fd.append("address", address);
            if (pictureFile) fd.append("profile_picture", pictureFile);
            const res = await apiRegister(fd);
            const accountId = role === "student" ? res.user.student_id : res.user.staff_id;
            toast.success(`${role === "student" ? "Student" : "Lecturer"} registered`, {
              description:
                `${res.user.full_name} · ${res.user.email}\n` +
                `${role === "student" ? "Student ID" : "Staff ID"}: ${accountId ?? "—"}\n` +
                `Temporary password: ${tempPassword}\n` +
                `Sign in at /${role}/login`,
            });
            form.reset();
            setLevel("");
            setSemester("");
            setProgram("");
            setPhoneNumber("");
            setDateOfBirth("");
            setGender("");
            setNationality("");
            setAddress("");
            setPictureFile(null);
            setPicturePreview(null);
            if (fileRef.current) fileRef.current.value = "";
            refreshId();
          } catch (err) {
            toast.error("Could not create account", {
              description: err instanceof Error ? err.message : "Check the details and try again.",
            });
          } finally {
            setSubmitting(false);
          }
        }}
        className="mt-8 grid gap-6 rounded-xl border border-border bg-card p-6 shadow-panel sm:p-8"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="role">Account type</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "student" | "lecturer")}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="lecturer">Lecturer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" placeholder="Ama Owusu" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">University email (auto-generated)</Label>
            <Input
              id="email"
              name="email"
              readOnly
              value={generatedEmail}
              placeholder="Derived from the student / staff ID"
              className="font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="department">Department</Label>
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setProgram("");
              }}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select a department" />
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

          {role === "student" && (
            <div className="grid gap-1.5">
              <Label htmlFor="program">Program</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger id="program">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="account_id">
              {role === "student" ? "Student ID (auto-generated)" : "Staff ID (auto-generated)"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="account_id"
                readOnly
                value={generatedId}
                placeholder={
                  department
                    ? idLoading
                      ? "Generating…"
                      : "Auto-generated"
                    : "Select a department to generate"
                }
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Regenerate ID"
                onClick={refreshId}
                disabled={!department || idLoading}
              >
                {idLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {role === "student" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="level">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Level" />
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
                <Label htmlFor="semester">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Sem" />
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
            <Label htmlFor="phone_number">Phone number</Label>
            <Input
              id="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0244 100 234"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
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
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="e.g. Ghanaian"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Residential address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Accra, Ghana"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
          {picturePreview ? (
            <img
              src={picturePreview}
              alt="Profile preview"
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary font-display text-xl font-extrabold text-muted-foreground">
              ?
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Profile picture</p>
            <p className="text-xs text-muted-foreground">
              Optional. Uploaded so the account already has a photo when it appears in search.
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
              setPicturePreview(URL.createObjectURL(file));
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" /> Upload photo
          </Button>
          {picturePreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setPictureFile(null);
                setPicturePreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove
            </Button>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="temp_password">Temporary password (auto-generated)</Label>
          <div className="flex gap-2">
            <Input id="temp_password" value={tempPassword} readOnly className="font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Regenerate password"
              onClick={() => setTempPassword(generateTempPassword())}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            8 characters, letters and numbers. The holder uses it to sign in and can change it from
            their profile.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-fit bg-crimson text-crimson-foreground hover:bg-crimson/90"
          disabled={submitting}
        >
          <UserPlus className="mr-2 h-4 w-4" />{" "}
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
