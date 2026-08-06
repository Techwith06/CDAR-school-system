import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  FileUp,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Presentation,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CdarLogo } from "@/components/cdar-logo";
import { DashboardMenu } from "@/components/dashboard-menu";
import { apiListNotifications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRoleGuard } from "@/lib/use-role-guard";

export const Route = createFileRoute("/lecturer")({
  component: LecturerLayout,
});

const LINKS = [
  { to: "/lecturer", label: "Teaching overview", icon: LayoutDashboard, exact: true },
  { to: "/lecturer/upload", label: "Publish material", icon: FileUp, exact: false },
  { to: "/lecturer/materials", label: "Course catalog", icon: LibraryBig, exact: false },
  { to: "/lecturer/notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/lecturer/profile", label: "Staff profile", icon: UserRound, exact: false },
] as const;

function LecturerLayout() {
  const user = useRoleGuard("lecturer");
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiListNotifications()
      .then((list) => {
        if (!cancelled) setUnread(Array.isArray(list) ? list.filter((n) => !n.read).length : 0);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted-foreground">Checking your staff session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-primary px-5 py-6 text-primary-foreground md:flex">
        <Link to="/lecturer" className="min-w-0">
          <CdarLogo subtitle="Lecturer workspace" inverted />
        </Link>

        <div className="mt-8 rounded-lg bg-primary-foreground/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Presentation className="h-4 w-4" /> {user.full_name}
          </p>
          <p className="mt-1 text-xs opacity-80">{user.department}</p>
        </div>

        <nav className="mt-8 grid flex-1 gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground data-[status=active]:bg-gold data-[status=active]:text-gold-foreground"
            >
              <l.icon className="h-4 w-4" />
              {l.label}
              {l.label === "Notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-crimson px-1.5 text-[10px] font-bold text-crimson-foreground">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <Button
          variant="outline"
          className="mt-4 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={() => {
            signOut();
            navigate({ to: "/lecturer/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Lecturer workspace
            </p>
            <p className="truncate text-lg font-bold">{user.full_name}</p>
          </div>
          <DashboardMenu
            brand="Lecturer workspace"
            className="md:hidden"
            groups={[
              {
                links: [
                  { to: "/lecturer", label: "Teaching overview", icon: LayoutDashboard, exact: true },
                  { to: "/lecturer/upload", label: "Publish material", icon: FileUp, exact: false },
                  { to: "/lecturer/materials", label: "Course catalog", icon: LibraryBig, exact: false },
                  { to: "/lecturer/notifications", label: "Notifications", icon: Bell, exact: false, badge: unread },
                  { to: "/lecturer/profile", label: "Staff profile", icon: UserRound, exact: false },
                ],
              },
            ]}
            user={{
              name: user.full_name,
              subtitle: user.department,
            }}
            signOut={() => {
              signOut();
              navigate({ to: "/lecturer/login" });
            }}
          />
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:flex"
          >
            <Home className="h-3.5 w-3.5" /> Public site
          </Link>
        </header>

        <main className="min-w-0 flex-1">
          {/* Required: nested lecturer routes render here. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
