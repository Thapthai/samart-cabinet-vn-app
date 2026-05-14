import { Badge } from '@/components/ui/badge';
import type { CabinetUserRow } from './types';

/** ชื่อตู้จาก app_cabinets (จับคู่ user_cabinet.cabinet_id = stock_id); ถ้าไม่พบแถวตู้แสดง cabinet_id */
export function CabinetLinksBadges({ row }: { row: CabinetUserRow }) {
  const links = row.linked_cabinets;
  if (!links?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        if (link.cabinet) {
          const label =
            link.cabinet.cabinet_name?.trim() ||
            link.cabinet.cabinet_code?.trim() ||
            `ตู้ #${link.cabinet.id}`;
          return (
            <Badge
              key={link.user_cabinet_id}
              variant="secondary"
              className="h-auto max-w-[280px] flex-col items-start gap-0.5 py-1.5 text-left font-normal"
              title={`cabinet_id ${link.cabinet_id} = stock_id`}
            >
              <span className="font-medium leading-snug text-slate-800">{label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">stock_id {link.cabinet_id}</span>
            </Badge>
          );
        }
        return (
          <Badge
            key={link.user_cabinet_id}
            variant="outline"
            className="border-amber-400 font-mono text-amber-900"
            title={`ไม่มี app_cabinets ที่ stock_id = ${link.cabinet_id}`}
          >
            cabinet_id {link.cabinet_id} (ไม่พบตู้)
          </Badge>
        );
      })}
    </div>
  );
}
