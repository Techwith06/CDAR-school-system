import { useEffect, useRef, useState } from "react";
import { Save, Trash2, Upload } from "lucide-react";
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
import { apiDepartments, apiListMaterials } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [studentId] = useState(user?.student_id ?? "");
  const [staffId, setStaffId] = useState(user?.staff_id ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [program] = useState(user?.program ?? "");
  const [level] = useState(String(user?.level ?? 300));
  const [semester] = useState(String(user?.semester ?? 1));
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [nationality, setNationality] = useState(user?.nationality ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptMaterialCount, setDeptMaterialCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiDepartments()
      .then((deptList) => {
        if (cancelled) return;
        setDepartments((Array.isArray(deptList) ? deptList : []).map((d) => d.name));
      })
      .catch(() => {
        /* keep options empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!department) return;
    let cancelled = false;
    apiListMaterials({ department })
      .then((list) => {
        if (!cancelled) setDeptMaterialCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {
        if (!cancelled) setDeptMaterialCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [department]);

  useEffect(
    () => () => {
      if (picturePreview) URL.revokeObjectURL(picturePreview);
    },
    [picturePreview],
  );

  if (!user) return null;

  const isStudent = user.role === "student";
  const isLecturer = user.role === "lecturer";
  const hasAcademic = isStudent || isLecturer;

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const idLabel = isStudent ? "Student ID" : "Staff ID";
  const idValue = isStudent ? studentId : staffId;
  const avatarSrc = picturePreview ?? user.profile_picture;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setRemovePicture(false);
    setPicturePreview(URL.createObjectURL(file));
  };

  const clearPicture = () => {
    setPictureFile(null);
    setPicturePreview(null);
    setRemovePicture(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    if (isStudent) {
      fd.append("phone_number", phoneNumber);
    } else {
      fd.append("full_name", fullName);
      fd.append("email", email);
      if (isLecturer) {
        fd.append("staff_id", staffId);
        fd.append("department_name", department);
      }
      fd.append("phone_number", phoneNumber);
      if (dateOfBirth) fd.append("date_of_birth", dateOfBirth);
      fd.append("gender", gender);
      fd.append("nationality", nationality);
      fd.append("address", address);
      if (pictureFile) fd.append("profile_picture", pictureFile);
      if (removePicture) fd.append("remove_profile_picture", "true");
    }
    try {
      await updateUser(fd);
      toast.success("Profile updated", { description: "Your details were saved." });
    } catch (err) {
      toast.error("Could not save profile", {
        description: err instanceof Error ? err.message : "Check the details and try again.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">My profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isStudent
          ? "Your academic details drive the recommendations you see on the dashboard."
          : isLecturer
            ? "Your staff details identify you as the publisher of materials in the catalog."
            : "Administrator profile used across the console."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-xl border border-border bg-card p-6 shadow-panel">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={fullName}
            className="h-20 w-20 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl font-extrabold text-primary-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-bold">{fullName}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className="capitalize">{user.role}</Badge>
            {idValue && (
              <Badge variant="outline">
                {idLabel}: {idValue}
              </Badge>
            )}
            {hasAcademic && <Badge variant="secondary">{department}</Badge>}
            {hasAcademic && <Badge variant="outline">{deptMaterialCount} materials in scope</Badge>}
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-6 rounded-xl border border-border bg-card p-6 shadow-panel"
      >
        {isStudent ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyRow label="Full name" value={fullName} />
              <ReadOnlyRow label="University email" value={email} />
              <ReadOnlyRow label="Student ID" value={studentId} />
              <ReadOnlyRow label="Department" value={department} />
              <ReadOnlyRow label="Program" value={program} />
              <ReadOnlyRow label="Level" value={level ? `Level ${level}` : "—"} />
              <ReadOnlyRow label="Semester" value={semester ? `Semester ${semester}` : "—"} />
              <ReadOnlyRow label="Date of birth" value={formatDate(dateOfBirth)} />
              <ReadOnlyRow label="Gender" value={gender} />
              <ReadOnlyRow label="Nationality" value={nationality} />
              <ReadOnlyRow label="Residential address" value={address} />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-border p-4">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={fullName}
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
                  Your photo and other personal details are managed by the administrative office.
                </p>
              </div>
            </div>

            <div className="grid gap-1.5 sm:max-w-sm">
              <Label htmlFor="phone_number">Phone number</Label>
              <Input
                id="phone_number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0244 100 234"
              />
              <p className="text-xs text-muted-foreground">
                This is the only detail you can change yourself.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {isLecturer && (
                <div className="grid gap-1.5">
                  <Label htmlFor="staff_id">Staff / Lecturer ID</Label>
                  <Input
                    id="staff_id"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. CS-0099"
                  />
                </div>
              )}

              {hasAcademic && (
                <div className="grid gap-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={department}
                    onValueChange={(v) => {
                      setDepartment(v);
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
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={fullName}
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
                onChange={pickFile}
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
                  onClick={clearPicture}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </>
        )}

        <Button type="submit" size="lg" className="w-fit">
          <Save className="mr-2 h-4 w-4" /> Save changes
        </Button>
      </form>
    </div>
  );
}
