import { useState, useEffect } from 'react';
import { cabinetApi } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

interface CreateCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateCabinetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCabinetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cabinet_name: '',
    stock_id: '',
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        cabinet_name: '',
        stock_id: '',
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const data: { cabinet_name?: string; stock_id?: number } = {
        cabinet_name: formData.cabinet_name || undefined,
      };
      if (formData.stock_id.trim()) {
        const sid = parseInt(formData.stock_id, 10);
        if (!Number.isNaN(sid)) data.stock_id = sid;
      }

      const response = await cabinetApi.create(data);

      if (response.success) {
        toast.success('เพิ่มตู้เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถเพิ่มตู้ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มตู้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>เพิ่มตู้ใหม่</span>
          </DialogTitle>
          <DialogDescription>
            รหัสตู้จะสร้างอัตโนมัติจากระบบ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cabinet_name">ชื่อตู้</Label>
            <Input
              id="cabinet_name"
              placeholder="เช่น ตู้ A1, ตู้ห้องผ่าตัด"
              value={formData.cabinet_name}
              onChange={(e) => setFormData({ ...formData, cabinet_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_id">Stock ID</Label>
            <Input
              id="stock_id"
              type="number"
              placeholder="กรอก Stock ID (ตัวเลข)"
              value={formData.stock_id}
              onChange={(e) => setFormData({ ...formData, stock_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ไม่กรอกระบบจะสร้างให้อัตโนมัติ
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? 'กำลังเพิ่ม...' : 'เพิ่มตู้'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
