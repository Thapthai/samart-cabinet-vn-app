'use client';

import * as React from 'react';
import { formatCEToBEDMY, parseBEDMYToCE } from '@/lib/datePickerBE';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const BE_OFFSET = 543;

interface DatePickerBEProps {
  /** ค่า YYYY-MM-DD (ค.ศ.) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function DatePickerBE({
  value,
  onChange,
  placeholder = 'วว/ดด/ปปปป (พ.ศ.)',
  className,
  id,
  disabled,
}: DatePickerBEProps) {
  const [inputText, setInputText] = React.useState(() => formatCEToBEDMY(value));
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, (m || 1) - 1, 1);
    }
    return new Date();
  });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInputText(formatCEToBEDMY(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputText(v);
  };

  const handleBlur = () => {
    const ce = parseBEDMYToCE(inputText);
    if (ce) {
      onChange(ce);
      setInputText(formatCEToBEDMY(ce));
    } else if (value) {
      setInputText(formatCEToBEDMY(value));
    } else {
      setInputText('');
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const yy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const ce = `${yy}-${mm}-${dd}`;
    onChange(ce);
    setInputText(formatCEToBEDMY(ce));
    setOpen(false);
  };

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const viewYearBE = viewYear + BE_OFFSET;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const handlePrevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

  React.useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', onOutside);
      return () => document.removeEventListener('mousedown', onOutside);
    }
  }, [open]);

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  return (
    <div ref={containerRef} className={cn('relative flex', className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={inputText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="flex-1 font-medium"
        autoComplete="off"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="ml-1 shrink-0 h-9 w-9"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="เลือกวันที่"
      >
        <CalendarIcon className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              ‹
            </Button>
            <span className="text-sm font-medium tabular-nums">
              {monthNames[viewMonth]} {viewYearBE}
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              ›
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w) => (
              <div key={w} className="font-medium text-gray-500 py-1">
                {w}
              </div>
            ))}
            {days.map((d, i) =>
              d === null ? (
                <div key={`e-${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded hover:bg-blue-100',
                    value === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-800'
                  )}
                  onClick={() => handleSelectDay(viewYear, viewMonth + 1, d)}
                >
                  {d}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
