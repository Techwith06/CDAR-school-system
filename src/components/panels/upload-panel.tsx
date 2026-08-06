import { useEffect, useState } from "react";
import { CloudUpload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVELS, MATERIAL_TYPES, SEMESTERS } from "@/lib/cdar-data";
import { apiUploadMaterial, apiCourses, type CourseDto } from "@/lib/api";

export function UploadPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [course, setCourse] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<CourseDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiCourses()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setCourses(list);
      })
      .catch(() => {
        /* keep options empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = courses.find((c) => c.course_code === course);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const file = formData.get("file") as File | null;
    if (!title || !course || !type || !level || !semester || !file) {
      toast.error("Validation error", {
        description: "Title, type, course code, level, semester and file are all required.",
      });
      return;
    }
    const fd = new FormData();
    fd.set("title", title);
    fd.set("type", type);
    fd.set("course_code", course);
    fd.set("level", level);
    fd.set("semester", semester);
    fd.set("file", file);
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "PDF";
    fd.set("file_ext", ext);
    fd.set("size_mb", (file.size / (1024 * 1024)).toFixed(1));
    setSubmitting(true);
    try {
      const uploaded = await apiUploadMaterial(fd);
      toast.success("Material published", {
        description: `${title} filed under ${course} · Level ${level} · Semester ${semester}.`,
        action: {
          label: "Download",
          onClick: () => window.open(uploaded.file_url, "_blank", "noopener,noreferrer"),
        },
      });
      form.reset();
      setFileName(null);
    } catch (err) {
      toast.error("Could not publish material", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Lecturer dashboard
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Upload a material</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Accepted files: PDF, DOCX, PPTX, ZIP. Files are published to your department catalog.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="mt-8 grid gap-8 rounded-xl border border-border bg-card p-6 shadow-panel sm:p-8"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="title">Material title</Label>
          <Input id="title" name="title" placeholder="ENTR 301 — Lecture Note 4: Pricing Models" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="type">Material type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="course">Course code</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger id="course">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.course_code}>
                    {c.course_code} — {c.course_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="level">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="100 / 200 / 300 / 400" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    Level {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="semester">Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger id="semester">
                <SelectValue placeholder="1 or 2" />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">Description (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Short summary students will see alongside the file."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="file">File</Label>
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-6 py-12 text-center transition-colors hover:border-primary"
          >
            {fileName ? (
              <>
                <FileCheck2 className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">{fileName}</span>
                <span className="text-xs text-muted-foreground">
                  Click to choose a different file
                </span>
              </>
            ) : (
              <>
                <CloudUpload className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Click to select a file</span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOCX, PPTX or ZIP — server-side size limit applies
                </span>
              </>
            )}
          </label>
          <input
            id="file"
            name="file"
            type="file"
            className="sr-only"
            accept=".pdf,.docx,.pptx,.zip"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </div>

        {selected && (
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Automatic categorization preview
            </p>
            <p className="mt-2 font-mono text-sm">
              {selected.department} / {selected.program} / Level {level || "—"} / Semester{" "}
              {semester || "—"} / {selected.course_code}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish material"}
          </Button>
          <Button type="reset" variant="outline" size="lg" onClick={() => setFileName(null)}>
            Reset form
          </Button>
        </div>
      </form>
    </div>
  );
}
