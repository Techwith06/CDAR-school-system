import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Bell, BookOpen, GraduationCap, Home, LibraryBig, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CdarLogo } from "@/components/cdar-logo";
import { DashboardMenu } from "@/components/dashboard-menu";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiListNotifications } from "@/lib/api";
import { useRoleGuard } from "@/lib/use-role-guard";

export const Route = createFileRoute("/student")({
  component: StudentLayout,
});

const LINKS = [
  { to: "/student", label: "Study hub", icon: GraduationCap, exact: true },
  { to: "/student/materials", label: "Materials", icon: LibraryBig, exact: false },
  { to: "/student/notifications", label: "Alerts", icon: Bell, exact: false },
  { to: "/student/profile", label: "My profile", icon: UserRound, exact: false },
] as const;

function StudentLayout() {
  const user = useRoleGuard("student");
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
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
        <p className="text-sm text-muted-foreground">Checking your student session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:gap-4 sm:py-5 sm:px-6">
          <Link to="/student" className="min-w-0">
            <CdarLogo subtitle="Student portal" size="sm" inverted />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <DashboardMenu
              brand="Student portal"
              variant="hero"
              className="md:hidden"
              groups={[
                {
                  links: [
                    { to: "/student", label: "Study hub", icon: GraduationCap, exact: true },
                    { to: "/student/materials", label: "Materials", icon: LibraryBig, exact: false },
                    { to: "/student/notifications", label: "Alerts", icon: Bell, exact: false, badge: unread },
                    { to: "/student/profile", label: "My profile", icon: UserRound, exact: false },
                  ],
                },
              ]}
              user={{
                name: user.full_name,
                subtitle: `Level ${user.level} · Semester ${user.semester} · ${user.program}`,
              }}
              signOut={() => {
                signOut();
                navigate({ to: "/student/login" });
              }}
            />
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold">{user.full_name}</span>
              <span className="block text-[11px] opacity-80">
                Level {user.level} · Semester {user.semester}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => {
                signOut();
                navigate({ to: "/student/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto hidden w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="flex shrink-0 items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 data-[status=active]:bg-gold data-[status=active]:text-gold-foreground"
            >
              {(l.label !== "Alerts" || isMobile) && <l.icon className="h-4 w-4" />}
              {l.label}
              {l.label === "Alerts" && unread > 0 && (
                <span className="rounded-full bg-crimson px-1.5 text-[10px] font-bold text-crimson-foreground">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="rule-tricolor" />
      </header>

      <main className="flex-1">
        {/* Required: nested student routes render here. */}
        <Outlet />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> CDAR student portal — {user.program}
          </span>
          <Link to="/" className="flex items-center gap-1.5 hover:text-foreground">
            <Home className="h-3.5 w-3.5" /> Public site
          </Link>
        </div>
      </footer>
    </div>
  );
}
