'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientCredentialsPanel } from './ClientCredentialsPanel';

interface RegeneratedCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientSecret: string;
  showSecret: boolean;
  onShowSecretChange: (v: boolean) => void;
  onCopy: (text: string, label: string) => void;
}

export function RegeneratedCredentialsDialog({
  open,
  onOpenChange,
  clientId,
  clientSecret,
  showSecret,
  onShowSecretChange,
  onCopy,
}: RegeneratedCredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Client Credentials ใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ClientCredentialsPanel
            clientId={clientId}
            clientSecret={clientSecret}
            showSecret={showSecret}
            onToggleShowSecret={() => onShowSecretChange(!showSecret)}
            onCopy={onCopy}
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onShowSecretChange(false);
            }}
          >
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
