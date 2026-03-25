import { Loader2 } from 'lucide-react';

export default function PermissionRolesPageLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}
