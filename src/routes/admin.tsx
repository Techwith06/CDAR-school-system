import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Gauge,
  Home,
  LibraryBig,
  LogOut,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CdarLogo } from "@/components/cdar-logo";
import { DashboardMenu } from "@/components/dashboard-menu";
import { apiListNotifications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRoleGuard } from "@/lib/use-role-guard";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const GROUPS = [
  {
    label: "Oversight",
    links: [
      { to: "/admin", label: "Console", icon: Gauge, exact: true },
      { to: "/admin/materials", label: "Moderate catalog", icon: LibraryBig, exact: false },
      { to: "/admin/departments", label: "Departments & programs", icon: Building2, exact: false },
      { to: "/admin/notifications", label: "System notices", icon: Bell, exact: false },
    ],
  },
  {
    label: "Accounts",
    links: [
      { to: "/admin/register", label: "Register account", icon: UserPlus, exact: false },
      { to: "/admin/users", label: "All users", icon: Users, exact: false },
      { to: "/admin/profile", label: "My profile", icon: UserRound, exact: false },
    ],
  },
] as const;

function AdminLayout() {
  const user = useRoleGuard("admin");
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
        <p className="text-sm text-muted-foreground">Verifying administrator session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Link to="/admin" className="min-w-0">
          <CdarLogo subtitle="Admin console" size="sm" />
        </Link>

        <div className="mt-6 flex-1 grid content-start gap-6">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {g.label}
              </p>
              <nav className="mt-2 grid gap-1">
                {g.links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    activeOptions={{ exact: l.exact }}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-crimson data-[status=active]:text-crimson-foreground"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <Link
          to="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent"
        >
          <Home className="h-4 w-4" /> Public site
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b py-2 border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <span className="flex items-center gap-2 rounded-md bg-crimson px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-crimson-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DashboardMenu
            brand="Admin console"
            className="ml-auto lg:hidden"
            activeClassName="data-[status=active]:bg-crimson data-[status=active]:text-crimson-foreground"
            groups={[
              {
                label: "Oversight",
                links: [
                  { to: "/admin", label: "Console", icon: Gauge, exact: true },
                  {
                    to: "/admin/materials",
                    label: "Moderate catalog",
                    icon: LibraryBig,
                    exact: false,
                  },
                  {
                    to: "/admin/departments",
                    label: "Departments & programs",
                    icon: Building2,
                    exact: false,
                  },
                  {
                    to: "/admin/notifications",
                    label: "System notices",
                    icon: Bell,
                    exact: false,
                    badge: unread,
                  },
                ],
              },
              {
                label: "Accounts",
                links: [
                  {
                    to: "/admin/register",
                    label: "Register account",
                    icon: UserPlus,
                    exact: false,
                  },
                  { to: "/admin/users", label: "All users", icon: Users, exact: false },
                  { to: "/admin/profile", label: "My profile", icon: UserRound, exact: false },
                ],
              },
            ]}
            user={{
              name: user.full_name,
              subtitle: user.email,
            }}
            signOut={() => {
              signOut();
              navigate({ to: "/admin/login" });
            }}
          />

          <div className="hidden items-center gap-2 lg:ml-auto lg:flex">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="System notices"
            >
              <Link to="/admin/notifications">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-crimson-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          {/* Required: nested admin routes render here. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
