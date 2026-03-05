import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string;
  onCreateClick?: () => void;
}

export default function DashboardHeader({ userName, onCreateClick }: DashboardHeaderProps) {
  return (
    <div className="px-0 py-4 sm:py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            สวัสดี, {userName}!
          </h1>
          <p className="mt-2 text-gray-600">
            ภาพรวมเวชภัณฑ์ของคุณ
          </p>
        </div>
        {onCreateClick && (
          <Button onClick={onCreateClick} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มอุปกรณ์ใหม่
          </Button>
        )}
      </div>
    </div>
  );
}

