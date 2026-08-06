import { Download, FileArchive, FileText, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeDate, typeLabel, type Material } from "@/lib/cdar-data";

const extIcon = (ext: string) => {
  if (ext === "PPTX") return Presentation;
  if (ext === "ZIP") return FileArchive;
  return FileText;
};

const downloadMaterial = (material: Material) => {
  window.open(material.file_url, "_blank", "noopener,noreferrer");
};

export function MaterialCard({ material }: { material: Material }) {
  const Icon = extIcon(material.file_ext);

  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-[11px]">
              {material.course_code}
            </Badge>
            <Badge className="bg-gold text-gold-foreground hover:bg-gold">
              {typeLabel(material.type)}
            </Badge>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{material.title}</h3>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="col-span-2 truncate">
          <dt className="sr-only">Department</dt>
          <dd>{material.department}</dd>
        </div>
        <div>
          <dt className="sr-only">Level</dt>
          <dd>Level {material.level}</dd>
        </div>
        <div>
          <dt className="sr-only">Semester</dt>
          <dd>Semester {material.semester}</dd>
        </div>
        <div className="col-span-2 truncate">
          <dt className="sr-only">Uploaded by</dt>
          <dd>
            {material.uploaded_by} · {relativeDate(material.created_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[11px] uppercase text-muted-foreground">
          {material.file_ext} · {material.size_mb} MB · {material.download_count} downloads
        </span>
        <Button size="sm" variant="outline" onClick={() => downloadMaterial(material)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </article>
  );
}
