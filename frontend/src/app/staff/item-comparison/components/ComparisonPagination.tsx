import TablePagination from '@/components/TablePagination';

interface ComparisonPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function ComparisonPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: ComparisonPaginationProps) {
  return (
    <TablePagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      variant="responsive"
      summary={
        <>
          หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
        </>
      }
    />
  );
}
