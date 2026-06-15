import TablePagination from '@/components/TablePagination';

interface DispensedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  countLabel?: string;
  loading?: boolean;
}

export default function DispensedPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  countLabel = 'รายการ',
  loading = false,
}: DispensedPaginationProps) {
  return (
    <TablePagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      loading={loading}
      summary={
        <>
          หน้า {currentPage} จาก {totalPages} ({totalItems} {countLabel})
        </>
      }
    />
  );
}
