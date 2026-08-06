import { useEffect, useState } from "react";
import { BellRing, CheckCheck, FileUp, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeDate, type Notification } from "@/lib/cdar-data";
import {
  apiListNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type NotificationDto,
} from "@/lib/api";

const iconFor = (kind: Notification["kind"]) =>
  kind === "new_material" ? BellRing : kind === "upload_confirmed" ? FileUp : Info;

const toNotification = (n: NotificationDto): Notification => ({
  id: n.id,
  title: n.title,
  body: n.body,
  kind: n.kind,
  read: n.read,
  created_at: n.created_at,
});

export function NotificationsPanel() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiListNotifications()
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        setItems(list.map(toNotification));
      })
      .catch(() => {
        /* leave empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiMarkAllNotificationsRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not update notifications");
    }
  };

  const markAsRead = async (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiMarkNotificationRead(id);
    } catch {
      /* keep local state */
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread} unread of {items.length}
          </p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <ul className="mt-8 grid gap-3">
        {items.map((n) => {
          const Icon = iconFor(n.kind);
          return (
            <li
              key={n.id}
              className={`flex gap-4 rounded-xl border p-5 transition-colors ${
                n.read ? "border-border bg-card" : "border-primary/40 bg-secondary/60"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold">{n.title}</h2>
                  {!n.read && (
                    <Badge className="bg-crimson text-crimson-foreground hover:bg-crimson">
                      New
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="font-mono text-[11px] uppercase text-muted-foreground">
                    {relativeDate(n.created_at)}
                  </span>
                  {!n.read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No notifications yet.
          </li>
        )}
      </ul>
    </div>
  );
}
