import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiListStudents, type ApiUser } from "@/lib/api";

type StudentSearchProps = {
  deptFilter?: string;
  className?: string;
};

export function StudentSearch({ deptFilter, className }: StudentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      apiListStudents({ search: q })
        .then((list) => {
          if (cancelled) return;
          const filtered = Array.isArray(list)
            ? list.filter((s) => !deptFilter || s.department === deptFilter)
            : [];
          setResults(filtered);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, deptFilter]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students by name or index number…"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {query.trim().length >= 2 && (
        <ul className="mt-3 grid max-h-80 gap-2 overflow-y-auto">
          {loading ? null : results.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No students match “{query.trim()}”.
            </li>
          ) : (
            results.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.full_name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {s.student_id ?? "—"} · {s.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {s.program || s.department || "—"}
                  </Badge>
                  {s.level > 0 && (
                    <Badge variant="outline">
                      L{s.level} S{s.semester}
                    </Badge>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
