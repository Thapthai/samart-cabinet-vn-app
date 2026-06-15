'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generateTablePageNumbers } from '@/lib/tablePagination';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  summary?: ReactNode;
  className?: string;
  /** responsive = flex-col บนมือถือ (เช่น medical-supplies) */
  variant?: 'default' | 'responsive';
}

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  summary,
  className,
  variant = 'default',
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = generateTablePageNumbers(currentPage, totalPages);

  const buttons = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1 || loading}
      >
        แรกสุด
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
      >
        ก่อนหน้า
      </Button>
      {pageNumbers.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Button
            key={page}
            type="button"
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page as number)}
            disabled={loading}
          >
            {page}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
      >
        ถัดไป
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages || loading}
      >
        สุดท้าย
      </Button>
    </>
  );

  if (variant === 'responsive') {
    return (
      <div
        className={cn(
          'mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        {summary ? (
          <div className="text-sm text-gray-500 text-center sm:text-left">{summary}</div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">{buttons}</div>
      </div>
    );
  }

  return (
    <div className={cn('mt-6 flex items-center justify-between border-t pt-4', className)}>
      {summary ? <div className="text-sm text-gray-500">{summary}</div> : <div />}
      <div className="flex items-center space-x-2">{buttons}</div>
    </div>
  );
}
