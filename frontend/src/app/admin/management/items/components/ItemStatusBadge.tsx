import type { Item } from '@/types/item';
import { itemIsActive } from './itemHelpers';

export default function ItemStatusBadge({ item }: { item: Item }) {
  if (itemIsActive(item)) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
        ใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      ปิดการใช้งาน
    </span>
  );
}
