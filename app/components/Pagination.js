"use client";

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  containerClassName = "flex justify-center mt-6 gap-2" 
}) {
  if (totalPages <= 1) return null;
  
  return (
    <div className={containerClassName}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-md text-sm font-medium ${
          currentPage === 1
            ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
            : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]'
        }`}
      >
        Previous
      </button>
      
      {/* Page number buttons */}
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        // Show first page, last page, current page, and pages around current
        let pageToShow;
        if (totalPages <= 5) {
          // If 5 or fewer pages, show all
          pageToShow = i + 1;
        } else if (currentPage <= 3) {
          // Near start
          pageToShow = i + 1;
          if (i === 4) pageToShow = totalPages;
        } else if (currentPage >= totalPages - 2) {
          // Near end
          pageToShow = i === 0 ? 1 : totalPages - 4 + i;
        } else {
          // Middle
          pageToShow = i === 0 ? 1 : i === 4 ? totalPages : currentPage - 1 + i;
        }
        
        // Add ellipsis
        if ((i === 1 && pageToShow !== 2) || (i === 3 && pageToShow !== totalPages - 1)) {
          return (
            <span key={`ellipsis-${i}`} className="px-3 py-1 text-[var(--text-light)]">
              ...
            </span>
          );
        }
        
        return (
          <button
            key={`page-${pageToShow}`}
            onClick={() => onPageChange(pageToShow)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              currentPage === pageToShow
                ? 'bg-[var(--primary-color)] text-white'
                : 'bg-[var(--border-color)] text-[var(--text-light)] hover:bg-[var(--hover-color)]'
            }`}
          >
            {pageToShow}
          </button>
        );
      })}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded-md text-sm font-medium ${
          currentPage === totalPages
            ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
            : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]'
        }`}
      >
        Next
      </button>
    </div>
  );
} 