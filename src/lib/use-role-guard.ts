import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/cdar-data";
import { roleLogin } from "@/lib/auth";

/** Redirects to the role's own login page unless a matching session exists. */
export function useRoleGuard(role: Role) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== role) navigate({ to: roleLogin[role], replace: true });
  }, [ready, user, role, navigate]);

  return user && user.role === role ? user : null;
}
