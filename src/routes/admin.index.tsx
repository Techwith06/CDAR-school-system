import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  FileWarning,
  GraduationCap,
  HardDrive,
  Landmark,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { relativeDate } from "@/lib/cdar-data";
import { apiAdminStats, type AdminStatsDto } from "@/lib/api";
import { StudentSearch } from "@/components/student-search";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console — CDAR Repository Administration" },
      {
        name: "description",
        content:
          "Repository-wide metrics for CDAR administrators: accounts by role, storage, department coverage and recent registrations.",
      },
      { property: "og:title", content: "Admin Console — CDAR" },
      {
        property: "og:description",
        content: "Accounts, storage and department coverage at a glance.",
      },
    ],
  }),
  component: AdminHome,
});

const ICONS = [Users, Database, GraduationCap, HardDrive, FileWarning, Landmark] as const;

function AdminHome() {
  const [statsData, setStatsData] = useState<AdminStatsDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiAdminStats()
      .then((data) => {
        if (!cancelled) setStatsData(data);
      })
      .catch(() => {
        /* leave empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = statsData?.total_users ?? 0;
  const totalMaterials = statsData?.total_materials ?? 0;
  const totalCourses = statsData?.total_courses ?? 0;
  const storageMb = statsData?.storage_mb ?? 0;
  const inactiveUsers = statsData?.inactive_users ?? 0;
  const departmentsServed = statsData?.materials_by_department.length ?? 0;

  const stats = [
    { label: "Total accounts", value: totalUsers, icon: ICONS[0] },
    { label: "Materials on file", value: totalMaterials, icon: ICONS[1] },
    { label: "Courses on file", value: totalCourses, icon: ICONS[2] },
    { label: "Storage used", value: `${storageMb.toFixed(1)} MB`, icon: ICONS[3] },
    { label: "Deactivated accounts", value: inactiveUsers, icon: ICONS[4] },
    { label: "Departments served", value: departmentsServed, icon: ICONS[5] },
  ] as const;

  const usersByRole = statsData?.users_by_role ?? {};
  const deptCounts = statsData?.materials_by_department ?? [];
  const maxDept = Math.max(0, ...deptCounts.map((d) => d.count));
  const recentUsers = statsData?.recent_users ?? [];

  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Repository console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision accounts, moderate uploads and monitor repository health.
          </p>
        </div>
        <Button asChild className="bg-crimson text-crimson-foreground hover:bg-crimson/90">
          <Link to="/admin/register">
            <UserPlus className="mr-2 h-4 w-4" /> Register account
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-3d reveal-up min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-crimson text-crimson-foreground">
                <s.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
          <h2 className="text-lg font-bold">Accounts by role</h2>
          <ul className="mt-4 grid gap-4">
            {(["student", "lecturer", "admin"] as const).map((r) => {
              const count = usersByRole[r] ?? 0;
              return (
                <li key={r}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{r}s</span>
                    <span className="font-mono text-xs text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-crimson"
                      style={{ width: `${totalUsers ? (count / totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Students and lecturers can only be created here.
          </p>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-panel">
          <h2 className="text-lg font-bold">Materials per department</h2>
          <ul className="mt-4 grid gap-4">
            {deptCounts.map((d) => (
              <li key={d.department}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{d.department}</span>
                  <span className="font-mono text-xs text-muted-foreground">{d.count}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${maxDept ? (d.count / maxDept) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Find a student</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Look up any student by full name or index number.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">Manage all users</Link>
          </Button>
        </div>
        <StudentSearch className="mt-4" />
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Recently registered accounts</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">Manage all users</Link>
          </Button>
        </div>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "student" ? "secondary" : "default"}
                      className="capitalize"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {relativeDate(u.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
