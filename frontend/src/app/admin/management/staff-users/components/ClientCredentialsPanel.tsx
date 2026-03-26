'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface ClientCredentialsPanelProps {
  clientId: string;
  clientSecret: string;
  showSecret: boolean;
  onToggleShowSecret: () => void;
  onCopy: (text: string, label: string) => void;
}

export function ClientCredentialsPanel({
  clientId,
  clientSecret,
  showSecret,
  onToggleShowSecret,
  onCopy,
}: ClientCredentialsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 font-medium">กรุณาบันทึกข้อมูลเหล่านี้ จะไม่สามารถแสดงอีกครั้ง</p>
      </div>
      <div>
        <Label>Client ID</Label>
        <div className="flex gap-2">
          <Input value={clientId} readOnly className="font-mono text-sm" />
          <Button type="button" size="icon" variant="outline" onClick={() => onCopy(clientId, 'Client ID')}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div>
        <Label>Client Secret</Label>
        <div className="flex gap-2">
          <Input type={showSecret ? 'text' : 'password'} value={clientSecret} readOnly className="font-mono text-sm" />
          <Button type="button" size="icon" variant="outline" onClick={onToggleShowSecret}>
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => onCopy(clientSecret, 'Client Secret')}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
