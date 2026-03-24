import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getActionTypeLabel, getMethodFromAction } from '../utils';

export function MethodTypeBadge({ action }: { action: any }) {
  const typeLabel = getActionTypeLabel(action);
  const method = getMethodFromAction(action);
  const classes: Record<string, string> = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200',
    POST:
      typeLabel === 'CREATE'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-green-50 text-green-700 border-green-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
    OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-mono', classes[method] ?? classes.OTHER)}>
      {typeLabel}
    </Badge>
  );
}

export function ActionStatusBadge({ action }: { action: any }) {
  if (!action || typeof action !== 'object') return null;
  const status = (action as Record<string, unknown>).status as string | undefined;
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s === 'success')
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
        SUCCESS
      </Badge>
    );
  if (s === 'error')
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
        ERROR
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
      {status}
    </Badge>
  );
}
